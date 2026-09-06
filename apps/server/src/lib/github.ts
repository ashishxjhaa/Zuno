import jwt from "jsonwebtoken"
import { Octokit } from "@octokit/rest"
import { decryptSecret, encryptSecret } from "./crypto"

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
const OAUTH_SCOPES = "repo"
const STATE_TTL = "10m"

export type GithubOAuthState = {
  userId: string
  returnTo: string
}

function requireGithubEnv(name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET" | "GITHUB_CALLBACK_URL") {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

export function githubConfigured() {
  return Boolean(
    process.env.GITHUB_CLIENT_ID?.trim() &&
      process.env.GITHUB_CLIENT_SECRET?.trim() &&
      process.env.GITHUB_CALLBACK_URL?.trim()
  )
}

export function createOAuthState(payload: GithubOAuthState) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: STATE_TTL })
}

export function verifyOAuthState(state: string): GithubOAuthState {
  const payload = jwt.verify(state, process.env.JWT_SECRET!)
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as GithubOAuthState).userId !== "string" ||
    typeof (payload as GithubOAuthState).returnTo !== "string"
  ) {
    throw new Error("Invalid OAuth state")
  }
  return payload as GithubOAuthState
}

export function buildAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: requireGithubEnv("GITHUB_CLIENT_ID"),
    redirect_uri: requireGithubEnv("GITHUB_CALLBACK_URL"),
    scope: OAUTH_SCOPES,
    state,
    allow_signup: "true",
  })
  return `${GITHUB_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForToken(code: string) {
  const res = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: requireGithubEnv("GITHUB_CLIENT_ID"),
      client_secret: requireGithubEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: requireGithubEnv("GITHUB_CALLBACK_URL"),
    }),
  })
  if (!res.ok) {
    throw new Error("GitHub token exchange failed")
  }
  const data = (await res.json()) as {
    access_token?: string
    error?: string
    error_description?: string
  }
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || "No access token returned")
  }
  return data.access_token
}

export function storeAccessToken(plain: string) {
  return encryptSecret(plain)
}

export function loadAccessToken(encrypted: string) {
  return decryptSecret(encrypted)
}

export function octokitForToken(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

export function slugifyRepoName(input: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 100)
  return slug || "zuno-project"
}

// Allow only safe absolute paths on the frontend (blocks open redirects)
export function sanitizeReturnTo(raw: string | undefined | null) {
  const frontend = (process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  )
  if (!raw || typeof raw !== "string") {
    return `${frontend}/`
  }
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return `${frontend}${raw}`
  }
  try {
    const url = new URL(raw)
    const allowed = new URL(frontend)
    if (url.origin === allowed.origin) {
      return url.toString()
    }
  } catch {
    // fall through
  }
  return `${frontend}/`
}

export async function ensureGithubRepo(
  octokit: Octokit,
  opts: {
    owner: string
    repoName: string
    existingFullName?: string | null
    description?: string
  }
) {
  if (opts.existingFullName) {
    const [owner, repo] = opts.existingFullName.split("/")
    if (owner && repo) {
      const { data } = await octokit.repos.get({ owner, repo })
      return {
        owner: data.owner.login,
        repo: data.name,
        fullName: data.full_name,
        htmlUrl: data.html_url,
        defaultBranch: data.default_branch || "main",
        created: false,
      }
    }
  }

  try {
    const { data } = await octokit.repos.get({
      owner: opts.owner,
      repo: opts.repoName,
    })
    return {
      owner: data.owner.login,
      repo: data.name,
      fullName: data.full_name,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch || "main",
      created: false,
    }
  } catch (error: unknown) {
    const status = (error as { status?: number }).status
    if (status !== 404) throw error
  }

  const { data } = await octokit.repos.createForAuthenticatedUser({
    name: opts.repoName,
    description: opts.description || "Generated with Zuno",
    private: false,
    // Empty repos reject Git Data API blobs ("Git Repository is empty").
    auto_init: true,
  })

  const defaultBranch = data.default_branch || "main"
  // Wait until the initial commit/ref exists before blob writes.
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      await octokit.git.getRef({
        owner: data.owner.login,
        repo: data.name,
        ref: `heads/${defaultBranch}`,
      })
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }

  return {
    owner: data.owner.login,
    repo: data.name,
    fullName: data.full_name,
    htmlUrl: data.html_url,
    defaultBranch,
    created: true,
  }
}

// Push the full file tree with the Git Data API (no git binary needed)
export async function pushFilesToRepo(
  octokit: Octokit,
  opts: {
    owner: string
    repo: string
    defaultBranch: string
    files: Record<string, string>
    message: string
  }
) {
  const entries = Object.entries(opts.files).filter(([path, content]) => {
    if (!path || path.includes("\0")) return false
    if (typeof content !== "string") return false
    // Skip huge files (>1MB text) to stay within blob limits comfortably
    if (Buffer.byteLength(content, "utf8") > 900_000) return false
    return true
  })

  if (entries.length === 0) {
    throw new Error("No project files to push")
  }

  const treeItems: Array<{
    path: string
    mode: "100644"
    type: "blob"
    sha: string
  }> = []

  // Create blobs in modest parallel batches
  const BATCH = 12
  for (let i = 0; i < entries.length; i += BATCH) {
    const slice = entries.slice(i, i + BATCH)
    const blobs = await Promise.all(
      slice.map(async ([path, content]) => {
        const { data } = await octokit.git.createBlob({
          owner: opts.owner,
          repo: opts.repo,
          content: Buffer.from(content, "utf8").toString("base64"),
          encoding: "base64",
        })
        return {
          path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: data.sha,
        }
      })
    )
    treeItems.push(...blobs)
  }

  let parentSha: string | undefined
  try {
    const { data: ref } = await octokit.git.getRef({
      owner: opts.owner,
      repo: opts.repo,
      ref: `heads/${opts.defaultBranch}`,
    })
    parentSha = ref.object.sha
  } catch {
    parentSha = undefined
  }

  const { data: tree } = await octokit.git.createTree({
    owner: opts.owner,
    repo: opts.repo,
    tree: treeItems,
  })

  const { data: commit } = await octokit.git.createCommit({
    owner: opts.owner,
    repo: opts.repo,
    message: opts.message,
    tree: tree.sha,
    parents: parentSha ? [parentSha] : [],
  })

  if (parentSha) {
    await octokit.git.updateRef({
      owner: opts.owner,
      repo: opts.repo,
      ref: `heads/${opts.defaultBranch}`,
      sha: commit.sha,
    })
  } else {
    await octokit.git.createRef({
      owner: opts.owner,
      repo: opts.repo,
      ref: `refs/heads/${opts.defaultBranch}`,
      sha: commit.sha,
    })
  }

  return { commitSha: commit.sha, fileCount: treeItems.length }
}

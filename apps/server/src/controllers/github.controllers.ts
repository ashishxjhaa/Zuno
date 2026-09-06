import type { Request, Response } from "express"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { listProjectFiles } from "../lib/e2b"
import {
  buildAuthorizeUrl,
  createOAuthState,
  ensureGithubRepo,
  exchangeCodeForToken,
  githubConfigured,
  loadAccessToken,
  octokitForToken,
  pushFilesToRepo,
  sanitizeReturnTo,
  slugifyRepoName,
  storeAccessToken,
  verifyOAuthState,
} from "../lib/github"

const pushSchema = z.object({
  repoName: z
    .string()
    .trim()
    .min(1, "Repository name is required")
    .max(100, "Repository name is too long")
    .optional(),
})

function frontendErrorRedirect(message: string, returnTo?: string) {
  const target = new URL(sanitizeReturnTo(returnTo))
  target.searchParams.set("github", "error")
  target.searchParams.set("message", message.slice(0, 200))
  return target.toString()
}

function frontendSuccessRedirect(returnTo: string) {
  const target = new URL(sanitizeReturnTo(returnTo))
  target.searchParams.set("github", "connected")
  return target.toString()
}

/** GET /api/v1/github/oauth/start?returnTo=/projects/... */
export async function oauthStart(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }
    if (!githubConfigured()) {
      return res.status(503).json({
        error:
          "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL.",
      })
    }

    const returnTo =
      typeof req.query.returnTo === "string" ? req.query.returnTo : "/"
    const state = createOAuthState({
      userId: req.userId,
      returnTo: sanitizeReturnTo(returnTo),
    })
    const url = buildAuthorizeUrl(state)
    return res.redirect(302, url)
  } catch (error) {
    console.error("[github/oauth/start]", error)
    return res.status(500).json({ error: "Could not start GitHub OAuth" })
  }
}

/** GET /api/v1/github/oauth/callback?code=&state= */
export async function oauthCallback(req: Request, res: Response) {
  const code = typeof req.query.code === "string" ? req.query.code : ""
  const state = typeof req.query.state === "string" ? req.query.state : ""
  const oauthError =
    typeof req.query.error === "string" ? req.query.error : ""

  let returnTo = sanitizeReturnTo("/")

  try {
    if (state) {
      const parsed = verifyOAuthState(state)
      returnTo = sanitizeReturnTo(parsed.returnTo)
      if (oauthError) {
        return res.redirect(
          302,
          frontendErrorRedirect("GitHub authorization was denied", returnTo)
        )
      }
      if (!code) {
        return res.redirect(
          302,
          frontendErrorRedirect("Missing OAuth code", returnTo)
        )
      }
      const userId = parsed.userId
      const accessToken = await exchangeCodeForToken(code)
      const octokit = octokitForToken(accessToken)
      const { data: ghUser } = await octokit.users.getAuthenticated()

      await prisma.user.update({
        where: { id: userId },
        data: {
          githubUsername: ghUser.login,
          githubAccessToken: storeAccessToken(accessToken),
          githubConnectedAt: new Date(),
        },
      })

      return res.redirect(302, frontendSuccessRedirect(returnTo))
    }

    return res.redirect(
      302,
      frontendErrorRedirect("Invalid OAuth state", returnTo)
    )
  } catch (error) {
    console.error("[github/oauth/callback]", error)
    const message =
      error instanceof Error ? error.message : "GitHub OAuth failed"
    return res.redirect(302, frontendErrorRedirect(message, returnTo))
  }
}

/** GET /api/v1/github/status */
export async function githubStatus(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        githubUsername: true,
        githubAccessToken: true,
        githubConnectedAt: true,
      },
    })

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    return res.status(200).json({
      configured: githubConfigured(),
      connected: Boolean(user.githubAccessToken && user.githubUsername),
      username: user.githubUsername,
      connectedAt: user.githubConnectedAt,
    })
  } catch {
    return res.status(500).json({ error: "Internal server error" })
  }
}

/** POST /api/v1/github/disconnect */
export async function githubDisconnect(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        githubUsername: null,
        githubAccessToken: null,
        githubConnectedAt: null,
      },
    })

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({ error: "Internal server error" })
  }
}

/** POST /api/v1/project/:id/github/push */
export async function pushProjectToGithub(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const parsed = pushSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid request",
      })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    if (project.phase === "PLANNING" || project.isGenerating) {
      return res.status(409).json({
        error: "Wait until generation finishes before pushing to GitHub",
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        githubUsername: true,
        githubAccessToken: true,
      },
    })

    if (!user?.githubAccessToken || !user.githubUsername) {
      return res.status(401).json({
        error: "Connect GitHub first",
      })
    }

    if (!project.sandboxId) {
      return res.status(409).json({
        error:
          "No live preview sandbox. Open the project so Zuno can restore the preview, then try again.",
      })
    }

    let files: Record<string, string> = {}
    try {
      files = await listProjectFiles(project.sandboxId)
    } catch (error) {
      console.error(`[github/push] list files ${id}`, error)
      return res.status(409).json({
        error:
          "Could not read project files from the sandbox. Restore the preview and try again.",
      })
    }

    if (Object.keys(files).length === 0) {
      return res.status(409).json({ error: "Project has no files to push" })
    }

    const accessToken = loadAccessToken(user.githubAccessToken)
    const octokit = octokitForToken(accessToken)

    const requestedName = parsed.data.repoName
      ? slugifyRepoName(parsed.data.repoName)
      : project.githubRepoName
        ? slugifyRepoName(project.githubRepoName)
        : slugifyRepoName(project.title)

    const repo = await ensureGithubRepo(octokit, {
      owner: user.githubUsername,
      repoName: requestedName,
      existingFullName: project.githubRepoFullName,
      description: `Generated with Zuno — ${project.title}`,
    })

    const push = await pushFilesToRepo(octokit, {
      owner: repo.owner,
      repo: repo.repo,
      defaultBranch: repo.defaultBranch,
      files,
      message: `Push from Zuno — ${project.title}`,
    })

    const updated = await prisma.project.update({
      where: { id },
      data: {
        githubRepoUrl: repo.htmlUrl,
        githubRepoName: repo.repo,
        githubRepoFullName: repo.fullName,
        lastActiveAt: new Date(),
      },
    })

    return res.status(200).json({
      url: updated.githubRepoUrl,
      repoName: updated.githubRepoName,
      fullName: updated.githubRepoFullName,
      created: repo.created,
      commitSha: push.commitSha,
      fileCount: push.fileCount,
    })
  } catch (error) {
    console.error("[github/push]", error)
    const message =
      error instanceof Error ? error.message : "Could not push to GitHub"
    const status = (error as { status?: number }).status
    if (status === 401 || status === 403) {
      return res.status(401).json({
        error:
          "GitHub authorization expired or lacks permission. Disconnect and connect again.",
      })
    }
    if (status === 422) {
      return res.status(400).json({
        error: "GitHub rejected the repository name. Try a different name.",
      })
    }
    return res.status(500).json({ error: message })
  }
}

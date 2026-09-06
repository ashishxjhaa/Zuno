import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { FileType, Sandbox } from "e2b"

const PROJECT_DIR = "/home/user/project"
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".vite", ".next"])
const TEMPLATES_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../templates"
)
const DEV_LOG = "/tmp/zuno-dev-server.log"
const SNAPSHOT_TAR = "/tmp/zuno-snapshot.tar.gz"
// How long to wait for the dev server port (TCP is preferred over HTTP)
const WAIT_ATTEMPTS = 60
const WAIT_MS = 250

export type TemplateInfo = {
  name: string
  kind: "vite" | "next"
  port: number
}

export type SandboxBoot = {
  sandbox: Sandbox
  template: TemplateInfo
  // True when the sandbox came from a prebaked template with deps installed
  prebaked: boolean
}

export function resolveTemplate(
  framework?: string | null,
  language?: string | null
): TemplateInfo {
  const lang = language === "javascript" ? "js" : "ts"
  if (framework === "nextjs") {
    return { name: `next-${lang}`, kind: "next", port: 3000 }
  }
  return { name: `vite-react-${lang}`, kind: "vite", port: 5173 }
}

// Env var name for this stack's prebaked E2B template
export function e2bTemplateEnvKey(
  framework?: string | null,
  language?: string | null
): string {
  const info = resolveTemplate(framework, language)
  if (info.name === "vite-react-ts") return "E2B_TEMPLATE_REACT_TS"
  if (info.name === "vite-react-js") return "E2B_TEMPLATE_REACT_JS"
  if (info.name === "next-ts") return "E2B_TEMPLATE_NEXT_TS"
  if (info.name === "next-js") return "E2B_TEMPLATE_NEXT_JS"
  return "E2B_TEMPLATE_REACT_TS"
}

// Read the prebaked template alias from env, or null if unset
export function resolveE2bTemplateAlias(
  framework?: string | null,
  language?: string | null
): string | null {
  const envKey = e2bTemplateEnvKey(framework, language)
  const altKey = envKey.replace("E2B_TEMPLATE_REACT_", "E2B_TEMPLATE_VITE_REACT_")
  const alias =
    process.env[envKey]?.trim() ||
    process.env[altKey]?.trim() ||
    process.env.E2B_TEMPLATE?.trim() ||
    ""
  return alias || null
}

export function getPreviewUrl(sandbox: Sandbox, port: number) {
  return `https://${sandbox.getHost(port)}`
}

// Prefer a prebaked template; otherwise copy files and install deps
export async function createSandboxWithTemplate(
  framework?: string | null,
  language?: string | null
) {
  const template = resolveTemplate(framework, language)
  const alias = resolveE2bTemplateAlias(framework, language)
  const sandboxOpts = {
    timeoutMs: 60 * 60 * 1000,
    secure: false,
    network: {
      allowPublicTraffic: true,
      maskRequestHost: "localhost:${PORT}",
    },
  } as const

  if (alias) {
    console.log(`[sandbox] creating from prebaked template ${alias}`)
    const sandbox = await Sandbox.create(alias, sandboxOpts)
    return { sandbox, template, prebaked: true as const }
  }

  if (process.env.E2B_ALLOW_SLOW_FALLBACK !== "1") {
    throw new Error(
      `Missing E2B template for ${template.name}. Set the matching E2B_TEMPLATE_* env var (required for 10-12s preview).`
    )
  }

  console.warn(
    `[sandbox] slow fallback for ${template.name}: copying files and installing deps`
  )
  const templateDir = path.join(TEMPLATES_ROOT, template.name)
  const sandbox = await Sandbox.create(sandboxOpts)

  try {
    const files = await collectTemplateFiles(templateDir)
    await sandbox.files.write(files)
    await ensureBun(sandbox)
    return { sandbox, template, prebaked: false as const }
  } catch (error) {
    await sandbox.kill()
    throw error
  }
}

export async function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId)
}

export async function killSandbox(sandboxId: string) {
  await Sandbox.kill(sandboxId)
}

export async function extendSandboxTimeout(sandboxId: string) {
  await Sandbox.setTimeout(sandboxId, 24 * 60 * 60 * 1000)
}

async function ensureBun(sandbox: Sandbox) {
  if (await hasBun(sandbox)) {
    return
  }
  console.log(`[bun] ${sandbox.sandboxId} installing ...`)
  const install = await sandbox.commands.run(
    'export BUN_INSTALL="/home/user/.bun"; curl -fsSL https://bun.sh/install | bash',
    { timeoutMs: 120_000, envs: bunEnv() }
  )
  if (install.exitCode !== 0) {
    throw new Error("Failed to install bun in sandbox")
  }
  if (!(await hasBun(sandbox))) {
    throw new Error("bun installed but binary missing at /home/user/.bun/bin/bun")
  }
}

async function hasBun(sandbox: Sandbox) {
  try {
    // E2B may ignore custom PATH, so check the absolute bun binary
    const check = await sandbox.commands.run(
      "test -x /home/user/.bun/bin/bun && /home/user/.bun/bin/bun --version",
      { timeoutMs: 10_000, envs: bunEnv() }
    )
    return check.exitCode === 0
  } catch {
    return false
  }
}

function bunEnv() {
  return {
    BUN_INSTALL: "/home/user/.bun",
    PATH: "/home/user/.bun/bin:/usr/local/bin:/usr/bin:/bin",
  }
}

// Install deps only on the slow path. Prebaked templates already have them
export async function installDependencies(sandbox: Sandbox) {
  console.log(`[install] ${sandbox.sandboxId} cold bun install ...`)
  await ensureBun(sandbox)
  const install = await sandbox.commands.run("/home/user/.bun/bin/bun install", {
    cwd: PROJECT_DIR,
    timeoutMs: 180_000,
    envs: runtimeEnv(),
  })
  if (install.exitCode !== 0) {
    console.error(
      `[install] ${sandbox.sandboxId} failed`,
      install.stderr || install.stdout
    )
    throw new Error("bun install failed")
  }
}

// Start the package.json dev script; retry once if the port never opens
export async function startDevServer(
  sandbox: Sandbox,
  port: number,
  kind: "vite" | "next" = port === 3000 ? "next" : "vite"
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= 2; attempt++) {
    await killPortListener(sandbox, port)
    const cmd = await resolveDevCommand(sandbox, port, kind)
    console.log(
      `[dev] ${sandbox.sandboxId} starting on ${port} (attempt ${attempt}): ${cmd}`
    )
    try {
      await sandbox.commands.run(`rm -f ${DEV_LOG}; (${cmd}) >${DEV_LOG} 2>&1`, {
        cwd: PROJECT_DIR,
        background: true,
        timeoutMs: 0,
        envs: runtimeEnv(),
      })
      await waitForServer(sandbox, port, kind)
      console.log(`[dev] ${sandbox.sandboxId} listening on ${port}`)
      return
    } catch (error) {
      lastError = error
      const log = await readDevLog(sandbox)
      console.error(
        `[dev] ${sandbox.sandboxId} attempt ${attempt} failed`,
        log.slice(0, 2000) || (error instanceof Error ? error.message : error)
      )
    }
  }
  const log = await readDevLog(sandbox)
  const detail = log.slice(0, 1500) || String(lastError)
  throw new Error(
    `Dev server did not start on ${port} (${kind}). ${summarizeDevFailure(detail)}`
  )
}

// Hit the local preview and fail if Next/Vite returns an app error page
export async function smokeLocalPreview(
  sandbox: Sandbox,
  port: number
): Promise<{ ok: boolean; detail: string }> {
  const script = `node -e "fetch('http://127.0.0.1:${port}/',{headers:{Accept:'text/html'}}).then(async(r)=>{const t=await r.text();const bad=/Application error|Server Error|ReferenceError|is not defined|Element type is invalid|Digest:/i.test(t);if(!r.ok||bad){console.log('FAIL',r.status);console.log(t.slice(0,900));process.exit(1)}console.log('OK',r.status);process.exit(0)}).catch((e)=>{console.log(String(e));process.exit(1)})"`
  try {
    const result = await sandbox.commands.run(script, {
      timeoutMs: 25_000,
      envs: runtimeEnv(),
    })
    const out = `${result.stdout || ""}${result.stderr || ""}`.trim()
    return { ok: true, detail: out || "ok" }
  } catch (error) {
    const err = error as { result?: { stdout?: string; stderr?: string }; message?: string }
    const out = `${err.result?.stdout || ""}${err.result?.stderr || ""}`.trim()
    return {
      ok: false,
      detail: out || err.message || "preview smoke failed",
    }
  }
}

export async function ensureDevServer(
  sandbox: Sandbox,
  port: number,
  kind: "vite" | "next" = port === 3000 ? "next" : "vite"
) {
  if (await isServerUp(sandbox, port)) {
    return
  }
  await startDevServer(sandbox, port, kind)
}

async function resolveDevCommand(
  sandbox: Sandbox,
  port: number,
  kind: "vite" | "next"
) {
  if (await hasBun(sandbox)) {
    // Use the absolute bun path because E2B drops custom PATH
    return "/home/user/.bun/bin/bun run dev"
  }
  // Some prebaked images lack bun even when node_modules exist
  console.warn(
    `[dev] ${sandbox.sandboxId} bun missing; falling back to node ${kind}`
  )
  if (kind === "next") {
    // Bind 0.0.0.0 so the E2B preview proxy can reach Next
    return `node ./node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port ${port}`
  }
  return `node ./node_modules/vite/bin/vite.js --host 0.0.0.0 --port ${port} --strictPort`
}

function runtimeEnv() {
  // Keep bun on PATH when present
  return bunEnv()
}

function summarizeDevFailure(detail: string) {
  const lower = detail.toLowerCase()
  if (lower.includes("bun: command not found") || lower.includes("bun: not found")) {
    return (
      "bun was missing in the sandbox and the node fallback did not come up. " +
      detail
    )
  }
  if (lower.includes("cannot find module") || lower.includes("enoent")) {
    return (
      "Dependencies look incomplete in the sandbox. Rebuild the E2B template. " +
      detail
    )
  }
  if (lower.includes("eaddrinuse")) {
    return "Dev port was still busy after cleanup. " + detail
  }
  return detail
}

async function readDevLog(sandbox: Sandbox) {
  try {
    const result = await sandbox.commands.run(
      `tail -n 80 ${DEV_LOG} 2>/dev/null || true`,
      { timeoutMs: 5_000 }
    )
    return (result.stdout || "").trim()
  } catch {
    return ""
  }
}


async function killPortListener(sandbox: Sandbox, port: number) {
  const killCommands = [
    "pkill -f 'vite' || true",
    "pkill -f 'next-server' || true",
    "pkill -f 'next dev' || true",
    `fuser -k ${port}/tcp 2>/dev/null || true`,
    `kill -9 $(lsof -ti:${port}) 2>/dev/null || true`,
  ]
  for (const cmd of killCommands) {
    try {
      await sandbox.commands.run(cmd, { timeoutMs: 5_000 })
    } catch {
      // ignore
    }
  }
  // Short pause so the port is free before relaunch
  await new Promise((resolve) => setTimeout(resolve, 200))
}

async function isServerUp(sandbox: Sandbox, port: number) {
  // Prefer a quick TCP check. A full HTTP fetch can hang while Next compiles.
  const tcp = `node -e "const n=require('net');const s=n.connect(${port},'127.0.0.1',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1500)"`
  try {
    await sandbox.commands.run(tcp, { timeoutMs: 3_000, envs: runtimeEnv() })
    return true
  } catch {
    // Fall back to a short HTTP check (Vite sometimes needs a real request)
  }
  const http = `node -e "const c=new AbortController();setTimeout(()=>c.abort(),1500);fetch('http://127.0.0.1:${port}/',{signal:c.signal}).then(()=>process.exit(0)).catch(()=>process.exit(1))"`
  try {
    await sandbox.commands.run(http, { timeoutMs: 3_000, envs: runtimeEnv() })
    return true
  } catch {
    return false
  }
}

async function waitForServer(
  sandbox: Sandbox,
  port: number,
  kind: "vite" | "next" = port === 3000 ? "next" : "vite"
) {
  for (let i = 0; i < WAIT_ATTEMPTS; i++) {
    if (await isServerUp(sandbox, port)) {
      return
    }
    // Fail fast on early crashes instead of waiting the full timeout
    if (i === 8 || i === 20) {
      const log = await readDevLog(sandbox)
      if (
        /bun: command not found|Cannot find module|EADDRINUSE|Error:/i.test(log) &&
        !(await isPortListening(sandbox, port))
      ) {
        throw new Error(
          summarizeDevFailure(log.slice(0, 1200) || "Dev process exited early")
        )
      }
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS))
  }
  const log = await readDevLog(sandbox)
  throw new Error(
    summarizeDevFailure(
      log.slice(0, 1200) || `Dev server did not start on ${port} (${kind})`
    )
  )
}

async function isPortListening(sandbox: Sandbox, port: number) {
  const cmd = `node -e "const n=require('net');const s=n.connect(${port},'127.0.0.1',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),800)"`
  try {
    await sandbox.commands.run(cmd, { timeoutMs: 2_000, envs: runtimeEnv() })
    return true
  } catch {
    return false
  }
}

export async function listProjectFiles(sandboxId: string) {
  const sandbox = await connectSandbox(sandboxId)
  const files: Record<string, string> = {}
  await walkFiles(sandbox, PROJECT_DIR, "", files)
  return files
}

// List paths only (no file contents). Best for the model file list
export async function listProjectPaths(sandboxId: string) {
  const sandbox = await connectSandbox(sandboxId)
  const paths: string[] = []
  await walkPaths(sandbox, PROJECT_DIR, "", paths)
  return paths
}

export async function readProjectFile(sandboxId: string, relativePath: string) {
  const sandbox = await connectSandbox(sandboxId)
  return readSandboxFile(sandbox, relativePath)
}

async function collectTemplateFiles(
  dir: string,
  prefix = ""
): Promise<{ path: string; data: string }[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: { path: string; data: string }[] = []

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name === ".DS_Store") continue
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectTemplateFiles(abs, rel)))
    } else {
      const dest = rel.endsWith(".tpl") ? rel.slice(0, -4) : rel
      files.push({
        path: `${PROJECT_DIR}/${dest}`,
        data: await readFile(abs, "utf8"),
      })
    }
  }

  return files
}

async function walkFiles(
  sandbox: Sandbox,
  absDir: string,
  relDir: string,
  out: Record<string, string>
) {
  const entries = await sandbox.files.list(absDir)
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name === ".DS_Store") continue
    const childAbs = `${absDir}/${entry.name}`
    const childRel = relDir ? `${relDir}/${entry.name}` : entry.name
    if (entry.type === FileType.DIR) {
      await walkFiles(sandbox, childAbs, childRel, out)
    } else if (entry.type === FileType.FILE) {
      out[childRel] = await sandbox.files.read(childAbs)
    }
  }
}

async function walkPaths(
  sandbox: Sandbox,
  absDir: string,
  relDir: string,
  out: string[]
) {
  const entries = await sandbox.files.list(absDir)
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name === ".DS_Store") continue
    const childAbs = `${absDir}/${entry.name}`
    const childRel = relDir ? `${relDir}/${entry.name}` : entry.name
    if (entry.type === FileType.DIR) {
      await walkPaths(sandbox, childAbs, childRel, out)
    } else if (entry.type === FileType.FILE) {
      out.push(childRel)
    }
  }
}

export async function writeProjectFile(
  sandbox: Sandbox,
  relativePath: string,
  contents: string
) {
  await sandbox.files.write(
    toSandboxPath(relativePath),
    preserveDevServerBind(relativePath, contents)
  )
}

// Write many files in one sandbox call (faster first paint via HMR)
export async function writeProjectFiles(
  sandbox: Sandbox,
  files: Array<{ path: string; contents: string }>
) {
  if (files.length === 0) return
  await sandbox.files.write(
    files.map((file) => ({
      path: toSandboxPath(file.path),
      data: preserveDevServerBind(file.path, file.contents),
    }))
  )
}

export async function updateProjectFile(
  sandbox: Sandbox,
  relativePath: string,
  contents: string
) {
  const target = toSandboxPath(relativePath)
  if (!(await sandbox.files.exists(target))) {
    throw new Error(`File not found: ${relativePath}`)
  }
  // Reject partial file fragments posed as a full rewrite
  const current = await sandbox.files.read(target)
  const trimmed = contents.trim()
  if (trimmed.length + 64 < current.length && current.includes(trimmed)) {
    throw new Error(
      `Refused: contents are only a fragment of the existing ${relativePath}. ` +
        `updateFile replaces the WHOLE file - resend the complete file, or use editFile for a targeted edit.`
    )
  }
  await sandbox.files.write(
    target,
    preserveDevServerBind(relativePath, contents)
  )
}

// Replace exact find text; fail if missing or matched more than once
export async function editProjectFile(
  sandbox: Sandbox,
  relativePath: string,
  find: string,
  replace: string,
  replaceAll = false
) {
  const target = toSandboxPath(relativePath)
  if (!(await sandbox.files.exists(target))) {
    throw new Error(`File not found: ${relativePath}`)
  }
  if (!find) {
    throw new Error("find must not be empty")
  }
  const current = await sandbox.files.read(target)
  const occurrences = current.split(find).length - 1
  if (occurrences === 0) {
    throw new Error(
      `find text not found in ${relativePath}. Read the file again and copy the exact snippet.`
    )
  }
  if (occurrences > 1 && !replaceAll) {
    throw new Error(
      `find text matches ${occurrences} places in ${relativePath}. Include more surrounding context or set replaceAll.`
    )
  }
  const next = replaceAll
    ? current.split(find).join(replace)
    : current.replace(find, replace)
  await sandbox.files.write(target, preserveDevServerBind(relativePath, next))
  return occurrences
}

export async function deleteProjectFile(
  sandbox: Sandbox,
  relativePath: string
) {
  await sandbox.files.remove(toSandboxPath(relativePath))
}

export async function readSandboxFile(sandbox: Sandbox, relativePath: string) {
  return sandbox.files.read(toSandboxPath(relativePath))
}

// Keep Vite/Next reachable if the model rewrites config
export function preserveDevServerBind(relativePath: string, contents: string) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "")
  const base = normalized.split("/").pop() || normalized

  if (base === "package.json") {
    try {
      const pkg = JSON.parse(contents) as {
        scripts?: Record<string, string>
      }
      if (pkg.scripts && typeof pkg.scripts.dev === "string") {
        let dev = pkg.scripts.dev
        if (/\bvite\b/.test(dev)) {
          if (!/(--host\b|-h\b|--host=)/.test(dev)) {
            dev = `${dev} --host`
          }
          if (!/(--port\b|-p\b|--port=)/.test(dev)) {
            dev = `${dev} --port 5173`
          } else {
            dev = dev.replace(/--port(=|\s+)\d+/g, "--port 5173")
            dev = dev.replace(/(?:^|\s)-p\s+\d+/g, " -p 5173")
          }
          pkg.scripts.dev = dev.replace(/\s+/g, " ").trim()
          return `${JSON.stringify(pkg, null, 2)}\n`
        }
        if (/\bnext\b/.test(dev)) {
          if (!/(-H\b|--hostname\b)/.test(dev)) {
            dev = `${dev} -H 0.0.0.0`
          }
          if (!/(-p\b|--port\b)/.test(dev)) {
            dev = `${dev} -p 3000`
          }
          pkg.scripts.dev = dev.replace(/\s+/g, " ").trim()
          return `${JSON.stringify(pkg, null, 2)}\n`
        }
      }
    } catch {
      return contents
    }
  }

  if (/^vite\.config\.(ts|js|mts|mjs)$/.test(base)) {
    let next = contents
    if (!/host\s*:\s*(true|['\"]0\.0\.0\.0['\"])/.test(next)) {
      if (/server\s*:\s*\{/.test(next)) {
        next = next.replace(/server\s*:\s*\{/, "server: {\n    host: true,")
      }
    }
    if (!/port\s*:\s*5173/.test(next)) {
      if (/server\s*:\s*\{/.test(next)) {
        next = next.replace(/server\s*:\s*\{/, "server: {\n    port: 5173,")
      }
    }
    if (!/strictPort\s*:\s*true/.test(next) && /server\s*:\s*\{/.test(next)) {
      next = next.replace(/server\s*:\s*\{/, "server: {\n    strictPort: true,")
    }
    return next
  }

  return contents
}


// Pack project source into a gzip tarball (skips deps, builds, caches)
export async function packProjectSnapshot(sandboxId: string): Promise<Uint8Array> {
  const sandbox = await connectSandbox(sandboxId)
  const excludes = [
    "node_modules",
    ".next",
    "dist",
    ".git",
    ".vite",
    ".turbo",
    ".cache",
    "coverage",
    ".DS_Store",
  ]
    .map((name) => `--exclude=${name}`)
    .join(" ")
  const pack = await sandbox.commands.run(
    `rm -f ${SNAPSHOT_TAR} && cd ${PROJECT_DIR} && tar czf ${SNAPSHOT_TAR} ${excludes} .`,
    { timeoutMs: 120_000 }
  )
  if (pack.exitCode !== 0) {
    throw new Error(pack.stderr || pack.stdout || "Failed to pack snapshot")
  }
  return sandbox.files.read(SNAPSHOT_TAR, { format: "bytes" })
}

// Unpack a snapshot tarball into the sandbox project folder
export async function applyProjectSnapshot(
  sandbox: Sandbox,
  archive: Uint8Array
) {
  const bytes =
    archive instanceof Uint8Array ? archive : new Uint8Array(archive)
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer
  await sandbox.files.write(SNAPSHOT_TAR, ab)
  // Keep template node_modules; replace the rest from the snapshot
  const extract = await sandbox.commands.run(
    `mkdir -p ${PROJECT_DIR} && cd ${PROJECT_DIR} && find . -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} + && tar xzf ${SNAPSHOT_TAR} -C ${PROJECT_DIR} && rm -f ${SNAPSHOT_TAR}`,
    { timeoutMs: 120_000 }
  )
  if (extract.exitCode !== 0) {
    throw new Error(
      extract.stderr || extract.stdout || "Failed to extract snapshot"
    )
  }
}

function toSandboxPath(relativePath: string) {
  const cleaned = relativePath.replace(/\\/g, "/").replace(/^\/+/, "")
  const parts = cleaned.split("/")
  if (
    !cleaned ||
    parts.includes("..") ||
    parts.some((part) => SKIP_DIRS.has(part))
  ) {
    throw new Error("Invalid path")
  }
  return `${PROJECT_DIR}/${cleaned}`
}

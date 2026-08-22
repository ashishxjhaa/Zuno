import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { CommandExitError, FileType, Sandbox } from "e2b"

const PROJECT_DIR = "/home/user/project"
const VITE_PORT = 5173
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".vite"])
const TEMPLATE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../templates/vite-react-ts"
)

// Create a VM, copy the Vite template, install deps, build it, and start a static preview server.
export async function createProjectSandbox() {
  const sandbox = await Sandbox.create({
    timeoutMs: 60 * 60 * 1000,
    secure: false,
    network: {
      allowPublicTraffic: true,
      maskRequestHost: "localhost:${PORT}",
    },
  })

  try {
    const files = await collectTemplateFiles(TEMPLATE_DIR)
    await sandbox.files.write(files)

    const install = await sandbox.commands.run("npm install", {
      cwd: PROJECT_DIR,
      timeoutMs: 180_000,
    })
    if (install.exitCode !== 0) {
      console.error(`[install] ${sandbox.sandboxId} failed`, install.stderr || install.stdout)
      throw new Error(`npm install failed`)
    }

    const built = await buildProject(sandbox)
    if (!built.ok) {
      throw new Error(`Initial template build failed: ${built.error}`)
    }
    await startPreview(sandbox)

    return {
      sandboxId: sandbox.sandboxId,
      previewUrl: `https://${sandbox.getHost(VITE_PORT)}`,
    }
  } catch (error) {
    await sandbox.kill()
    throw error
  }
}

// Reconnect to an existing sandbox by id.
export async function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId)
}

// Shut down the sandbox.
export async function killSandbox(sandboxId: string) {
  await Sandbox.kill(sandboxId)
}

// Push the VM lifetime to E2B's max so a published preview stays up.
export async function extendSandboxTimeout(sandboxId: string) {
  await Sandbox.setTimeout(sandboxId, 24 * 60 * 60 * 1000)
}

// Build the project into /home/user/project/dist.
async function buildProject(sandbox: Sandbox) {
  console.log(`[build] ${sandbox.sandboxId} ...`)
  try {
    await sandbox.commands.run("npx vite build", {
      cwd: PROJECT_DIR,
      timeoutMs: 180_000,
    })
    return { ok: true as const }
  } catch (error) {
    const detail =
      error instanceof CommandExitError
        ? [error.stderr, error.stdout].filter(Boolean).join("\n").trim()
        : error instanceof Error
          ? error.message
          : "Build failed"
    console.error(`[build] ${sandbox.sandboxId} failed`, detail.slice(0, 2000))
    return { ok: false as const, error: detail || "Build failed" }
  }
}

// Kill any process on the preview port and serve the built dist folder.
async function startPreview(sandbox: Sandbox) {
  await killPortListener(sandbox)
  await sandbox.commands.run("npm run preview", {
    cwd: PROJECT_DIR,
    background: true,
    timeoutMs: 0,
  })
  await waitForServer(sandbox)
}

// Rebuild and restart preview so the latest files are served.
export async function rebuildProject(sandbox: Sandbox) {
  const result = await buildProject(sandbox)
  if (!result.ok) {
    return result
  }
  await startPreview(sandbox)
  return { ok: true as const }
}

async function killPortListener(sandbox: Sandbox) {
  const killCommands = [
    "pkill -f 'vite' || true",
    "fuser -k 5173/tcp 2>/dev/null || true",
    "kill -9 $(lsof -ti:5173) 2>/dev/null || true",
  ]
  for (const cmd of killCommands) {
    try {
      await sandbox.commands.run(cmd, { timeoutMs: 5_000 })
    } catch {
      // ignore
    }
  }
}

// Poll until the server answers on port 5173.
async function waitForServer(sandbox: Sandbox) {
  const probe =
    "node -e \"fetch('http://127.0.0.1:5173').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""
  const logProbe =
    "cat /home/user/project/dist/index.html 2>/dev/null || ls /home/user/project/"

  for (let i = 0; i < 60; i++) {
    try {
      await sandbox.commands.run(probe, { timeoutMs: 5_000 })
      return
    } catch (error) {
      if (i === 45 || i === 55) {
        console.error(`[preview] ${sandbox.sandboxId} still not up, debug:`, error)
        try {
          const log = await sandbox.commands.run(logProbe, { timeoutMs: 5_000 })
          console.error(`[preview] ${sandbox.sandboxId} debug output:`, log.stdout, log.stderr)
        } catch {
          // ignore debug probe errors
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
  }

  throw new Error("Preview server did not start")
}

// List project files as path → contents (skips node_modules, dist, etc.).
export async function listProjectFiles(sandboxId: string) {
  const sandbox = await connectSandbox(sandboxId)
  const files: Record<string, string> = {}
  await walkFiles(sandbox, PROJECT_DIR, "", files)
  return files
}

// Read one file from the project folder in the sandbox.
export async function readProjectFile(sandboxId: string, relativePath: string) {
  const sandbox = await connectSandbox(sandboxId)
  return readSandboxFile(sandbox, relativePath)
}

// Read the local Vite template into [{ path in VM, contents }].
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
      // Templates ship as *.tpl so Vercel typecheck ignores them; restore real names in the sandbox.
      const dest = rel.endsWith(".tpl") ? rel.slice(0, -4) : rel
      files.push({
        path: `${PROJECT_DIR}/${dest}`,
        data: await readFile(abs, "utf8"),
      })
    }
  }

  return files
}

// List and read all files inside the sandbox project directory.
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

// Write a file in the sandbox project (creates folders as needed).
export async function writeProjectFile(
  sandbox: Sandbox,
  relativePath: string,
  contents: string,
) {
  await sandbox.files.write(toSandboxPath(relativePath), contents)
}

// Overwrite an existing file. Errors if the path is missing.
export async function updateProjectFile(
  sandbox: Sandbox,
  relativePath: string,
  contents: string,
) {
  const target = toSandboxPath(relativePath)
  if (!(await sandbox.files.exists(target))) {
    throw new Error(`File not found: ${relativePath}`)
  }
  await sandbox.files.write(target, contents)
}

// Delete a file or folder in the sandbox project.
export async function deleteProjectFile(
  sandbox: Sandbox,
  relativePath: string,
) {
  await sandbox.files.remove(toSandboxPath(relativePath))
}

// Read a file using an already-connected sandbox.
export async function readSandboxFile(sandbox: Sandbox, relativePath: string) {
  return sandbox.files.read(toSandboxPath(relativePath))
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

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { FileType, Sandbox } from "e2b"
const PROJECT_DIR = "/home/user/project"
const VITE_PORT = 5173
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".vite"])
const TEMPLATE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../templates/vite-react-ts"
)

// Create a VM, copy the Vite template, install deps, start Vite, return id + preview URL.
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

    await sandbox.commands.run("npm install", {
      cwd: PROJECT_DIR,
      timeoutMs: 180_000,
    })

    await sandbox.commands.run("npm run dev", {
      cwd: PROJECT_DIR,
      background: true,
      timeoutMs: 0,
    })
    await waitForVite(sandbox)

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
  return sandbox.files.read(toSandboxPath(relativePath))
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
      files.push({
        path: `${PROJECT_DIR}/${rel}`,
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

// Poll until Vite answers on port 5173.
async function waitForVite(sandbox: Sandbox) {
  const probe =
    "node -e \"fetch('http://127.0.0.1:5173').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""

  for (let i = 0; i < 30; i++) {
    try {
      await sandbox.commands.run(probe, { timeoutMs: 5_000 })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
  }

  throw new Error("Vite did not start")
}

// Turn a relative path into /home/user/project/... and block "..".
function toSandboxPath(relativePath: string) {
  const cleaned = relativePath.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!cleaned || cleaned.split("/").includes("..")) {
    throw new Error("Invalid path")
  }
  return `${PROJECT_DIR}/${cleaned}`
}

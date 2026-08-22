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

    const install = await sandbox.commands.run("npm install", {
      cwd: PROJECT_DIR,
      timeoutMs: 180_000,
      onStdout: (data) => console.log(`[install] ${sandbox.sandboxId}`, data),
      onStderr: (data) => console.error(`[install] ${sandbox.sandboxId}`, data),
    })
    if (install.exitCode !== 0) {
      throw new Error(`npm install failed: ${install.stderr || install.stdout}`)
    }

    await sandbox.commands.run("npm run dev", {
      cwd: PROJECT_DIR,
      background: true,
      timeoutMs: 0,
      onStdout: (data) => console.log(`[vite] ${sandbox.sandboxId}`, data),
      onStderr: (data) => console.error(`[vite] ${sandbox.sandboxId}`, data),
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

// Push the VM lifetime to E2B's max so a published preview stays up.
export async function extendSandboxTimeout(sandboxId: string) {
  await Sandbox.setTimeout(sandboxId, 24 * 60 * 60 * 1000)
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
  const logProbe =
    "cat /home/user/project/node_modules/.vite/deps/_metadata.json 2>/dev/null || ls /home/user/project/"

  for (let i = 0; i < 60; i++) {
    try {
      await sandbox.commands.run(probe, { timeoutMs: 5_000 })
      return
    } catch (error) {
      if (i === 45 || i === 55) {
        console.error(`[vite] ${sandbox.sandboxId} still not up, debug:`, error)
        try {
          const log = await sandbox.commands.run(logProbe, { timeoutMs: 5_000 })
          console.error(`[vite] ${sandbox.sandboxId} debug output:`, log.stdout, log.stderr)
        } catch {
          // ignore debug probe errors
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000))
    }
  }

  throw new Error("Vite did not start")
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

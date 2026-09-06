import { prisma } from "../src/lib/prisma"
import { downloadSnapshot } from "../src/lib/s3"
import {
  connectSandbox,
  createSandboxWithTemplate,
  applyProjectSnapshot,
  ensureDevServer,
  getPreviewUrl,
  resolveTemplate,
} from "../src/lib/e2b"

const id = process.argv[2]
if (!id) throw new Error("usage: bun run scripts/try-restore.ts <projectId>")

const project = await prisma.project.findUnique({ where: { id } })
if (!project) throw new Error("missing project")
console.log("project", {
  title: project.title,
  sandboxId: project.sandboxId,
  snapshotKey: project.snapshotKey,
  framework: project.framework,
  language: project.language,
  previewUrl: project.previewUrl,
})

if (!project.framework || !project.language) {
  throw new Error("no stack")
}
const info = resolveTemplate(project.framework, project.language)

if (project.sandboxId) {
  try {
    const live = await connectSandbox(project.sandboxId)
    await ensureDevServer(live, info.port, info.kind)
    const previewUrl = getPreviewUrl(live, info.port)
    console.log("REUSE OK", previewUrl)
    await prisma.project.update({
      where: { id },
      data: { previewUrl, phase: "READY", isGenerating: false, lastActiveAt: new Date() },
    })
    await prisma.$disconnect()
    process.exit(0)
  } catch (e) {
    console.warn("reuse failed", e)
  }
}

if (!project.snapshotKey) {
  console.error("NO SNAPSHOT — open would 409")
  await prisma.$disconnect()
  process.exit(2)
}

console.log("downloading", project.snapshotKey)
const archive = await downloadSnapshot(project.snapshotKey)
console.log("bytes", archive.byteLength)
const created = await createSandboxWithTemplate(project.framework, project.language)
console.log("sandbox", created.sandbox.sandboxId, "prebaked", created.prebaked)
await applyProjectSnapshot(created.sandbox, archive)
if (!created.prebaked) {
  console.log("installing deps...")
}
await ensureDevServer(created.sandbox, created.template.port, created.template.kind)
const previewUrl = getPreviewUrl(created.sandbox, created.template.port)
await prisma.project.update({
  where: { id },
  data: {
    sandboxId: created.sandbox.sandboxId,
    previewUrl,
    phase: "READY",
    isGenerating: false,
    lastActiveAt: new Date(),
  },
})
console.log("RESTORE OK", previewUrl)
await prisma.$disconnect()

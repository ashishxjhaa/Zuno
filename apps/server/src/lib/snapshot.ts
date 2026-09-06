import { prisma } from "./prisma"
import { packProjectSnapshot } from "./e2b"
import { projectSnapshotKey, uploadSnapshot } from "./s3"

// Pack sandbox source, upload to S3, and save snapshot metadata
export async function saveProjectSnapshot(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.sandboxId) {
    throw new Error("Project has no sandbox to snapshot")
  }

  const archive = await packProjectSnapshot(project.sandboxId)
  const key = projectSnapshotKey(project.userId, project.id)
  await uploadSnapshot(key, archive)

  const snapshotAt = new Date()
  await prisma.project.update({
    where: { id: projectId },
    data: { snapshotKey: key, snapshotAt, lastActiveAt: snapshotAt },
  })

  console.log(`[snapshot] ${projectId} uploaded ${key} (${archive.byteLength} bytes)`)
  return { key, snapshotAt }
}

// Save snapshot in the background so preview is never blocked by S3
export function queueSaveProjectSnapshot(projectId: string) {
  void saveProjectSnapshot(projectId).catch((error) => {
    console.error(`[snapshot] ${projectId}`, error)
  })
}

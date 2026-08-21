import { prisma } from "./prisma"
import { killSandbox } from "./e2b"

const IDLE_MS = 30 * 60 * 1000
const TICK_MS = 60 * 1000

// Every minute, kill unpublished projects with no heartbeat for 30 minutes.
export function startIdleReaper() {
  setInterval(() => {
    void reapIdleProjects()
  }, TICK_MS)
}

async function reapIdleProjects() {
  const cutoff = new Date(Date.now() - IDLE_MS)
  const stale = await prisma.project.findMany({
    where: {
      published: false,
      lastActiveAt: { lt: cutoff },
    },
  })

  for (const project of stale) {
    if (project.sandboxId) {
      try {
        await killSandbox(project.sandboxId)
      } catch (error) {
        console.error(`[idle] kill ${project.id}`, error)
      }
    }

    try {
      await prisma.project.delete({ where: { id: project.id } })
    } catch (error) {
      console.error(`[idle] delete ${project.id}`, error)
    }
  }
}

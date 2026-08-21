import { prisma } from "./prisma"

// Run DeepSeek against the project's sandbox.
export async function generateForProject(projectId: string) {
  await prisma.project.update({
    where: { id: projectId },
    data: { isGenerating: false },
  })
}

import type { Request, Response } from "express"
import { conversationSchema, createProjectSchema } from "../lib/schema"
import { prisma } from "../lib/prisma"
import { createProjectSandbox, listProjectFiles } from "../lib/e2b"
import { generateForProject } from "../lib/llm"

export async function create(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const parsed = createProjectSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid request",
      })
    }

    const { initialPrompt } = parsed.data
    const title = initialPrompt.split(/\s+/).slice(0, 6).join(" ")

    const project = await prisma.project.create({
      data: {
        title,
        initialPrompt,
        userId: req.userId,
        isGenerating: true,
      },
    })

    try {
      const { sandboxId, previewUrl } = await createProjectSandbox()

      await prisma.project.update({
        where: { id: project.id },
        data: {
          sandboxId,
          previewUrl,
          lastActiveAt: new Date(),
        },
      })

      await prisma.conversationHistory.create({
        data: {
          projectId: project.id,
          type: "TEXT_MESSAGE",
          from: "USER",
          contents: initialPrompt,
        },
      })
    } catch {
      await prisma.project.delete({ where: { id: project.id } })
      return res.status(500).json({ error: "Failed to start project" })
    }

    void generateForProject(project.id).catch((error) => {
      console.error(`[generate] ${project.id}`, error)
    })

    return res.status(201).json({ id: project.id })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export async function getById(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const project = await prisma.project.findUnique({
      where: { id },
    })

    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    const history = await prisma.conversationHistory.findMany({
      where: {
        projectId: id,
        hidden: false,
        type: "TEXT_MESSAGE",
      },
      orderBy: { createdAt: "asc" },
    })

    let files: Record<string, string> = {}
    if (project.sandboxId) {
      try {
        files = await listProjectFiles(project.sandboxId)
      } catch {
        files = {}
      }
    }

    return res.status(200).json({
      id: project.id,
      title: project.title,
      previewUrl: project.previewUrl,
      isGenerating: project.isGenerating,
      published: project.published,
      messages: history.map((message) => ({
        id: message.id,
        from: message.from,
        contents: message.contents,
        createdAt: message.createdAt,
      })),
      files,
    })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export async function conversation(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const parsed = conversationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid request",
      })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    if (!project.sandboxId) {
      return res.status(400).json({ error: "Project is not ready" })
    }

    if (project.isGenerating) {
      return res.status(409).json({ error: "Still generating" })
    }

    await prisma.conversationHistory.create({
      data: {
        projectId: id,
        type: "TEXT_MESSAGE",
        from: "USER",
        contents: parsed.data.contents,
      },
    })

    await prisma.project.update({
      where: { id },
      data: { isGenerating: true, lastActiveAt: new Date() },
    })

    void generateForProject(id).catch((error) => {
      console.error(`[generate] ${id}`, error)
    })

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

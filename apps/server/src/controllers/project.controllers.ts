import type { Request, Response } from "express"
import { createProjectSchema } from "../lib/schema"
import { prisma } from "../lib/prisma"

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
      },
    })

    return res.status(201).json({ id: project.id })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

import { prisma } from "../../db/db"
import { reviseProject } from "../services/ai"
import { applyOperations } from "../services/diff"

export function buildManifest(files) {
  const manifest = []
  for (const [path, entry] of Object.entries(files)) {
    manifest.push({ path, hash: entry.hash, size: entry.content.length })
  }
  return manifest
}

export async function chat(req, res) {
  const { prompt } = req.body

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "prompt is required",
    })
  }

  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ownerId: req.user.userId },
  })

  if (!project) {
    return res.status(404).json({
      error: "Project not found",
    })
  }

  project.status = "revising"
  project.messages.push({
    role: "user",
    content: prompt,
    timestamp: new Date(),
  })
  await project.save()

  try {
    const manifest = buildManifest(project.files)

    const relevantFiles = {}
    for (const [path, entry] of Object.entries(project.files)) {
      relevantFiles[path] = entry.content
    }

    const recentMessages = project.messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    console.log(
      `[AI] Revising project ${project.id}: "${prompt.slice(0, 80)}..." ` +
        `(${manifest.length} files, manifest ~${JSON.stringify(manifest).length} chars)`
    )

    const result = await reviseProject(
      prompt,
      manifest,
      relevantFiles,
      recentMessages
    )

    console.log(
      `[AI] Got ${result.operations.length} operations: ${result.description}`
    )

    const {
      files: updatedFiles,
      applied,
      errors,
    } = applyOperations(project.files, result.operations)

    if (errors.length > 0) {
      console.log(`[Diff] Errors applying operations:`, errors)
    }

    project.files = updatedFiles
    project.markModified("files")
    project.version += 1
    project.status = "completed"
    project.messages.push({
      role: "assistant",
      content:
        result.description +
        (errors.length > 0
          ? `\n\n Some operations failed: ${errors.join(" ")}`
          : ""),
    })

    await project.save()

    const filesObj = {}
    for (const [path, entry] of Object.entries(project.files)) {
      filesObj[path] = entry.content
    }

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      files: filesObj,
      messages: project.messages,
      version: project.version,
      status: project.status,
      applied,
      errors,
      aiDescription: result.description,
    })
  } catch (err) {
    console.error(`[AI Revision Error] ${err.message}`)
    project.status = "completed"
    await project.save()
    res.status(500).json({
      error: err.message || "Failed to process revision request",
    })
  }
}

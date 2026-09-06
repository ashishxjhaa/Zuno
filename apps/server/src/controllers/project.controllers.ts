import type { Request, Response } from "express"
import {
  conversationSchema,
  createProjectSchema,
  stackSchema,
} from "../lib/schema"
import { prisma } from "../lib/prisma"
import {
  applyProjectSnapshot,
  connectSandbox,
  createSandboxWithTemplate,
  ensureDevServer,
  extendSandboxTimeout,
  getPreviewUrl,
  installDependencies,
  listProjectFiles,
  packProjectSnapshot,
  resolveTemplate,
} from "../lib/e2b"
import { downloadSnapshot } from "../lib/s3"
import { generateForProject } from "../lib/llm"
import { confirmStackAndBuild, runIntakeTurnStreaming } from "../lib/intake"
import { initSse, keepAliveSse, sendSse } from "../lib/sse"
import JSZip from "jszip"

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
        phase: "PLANNING",
        isGenerating: true,
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

    // Client opens conversation SSE with resume:true to stream the first intake reply.
    return res.status(201).json({ id: project.id })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}


export async function list(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: [{ lastActiveAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        phase: true,
        framework: true,
        language: true,
        snapshotAt: true,
        lastActiveAt: true,
        updatedAt: true,
      },
    })

    return res.status(200).json({ projects })
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
      phase: project.phase,
      framework: project.framework,
      language: project.language,
      brief: project.brief,
      githubRepoUrl: project.githubRepoUrl,
      githubRepoName: project.githubRepoName,
      githubRepoFullName: project.githubRepoFullName,
      messages: history.map((message) => ({
        id: message.id,
        from: message.from,
        contents: message.contents,
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

  const resume = Boolean(parsed.data.resume)
  const contents = parsed.data.contents?.trim() ?? ""

  if (project.phase === "BUILDING") {
    return res.status(409).json({ error: "Still generating" })
  }

  // Resume only when a turn is already pending (create / interrupted).
  if (resume) {
    if (!project.isGenerating) {
      return res.status(409).json({ error: "Nothing to resume" })
    }
  } else if (project.isGenerating) {
    return res.status(409).json({ error: "Still generating" })
  }

  if (project.phase === "READY" && !project.sandboxId) {
    return res.status(400).json({ error: "Project is not ready" })
  }

  if (!resume && contents) {
    await prisma.conversationHistory.create({
      data: {
        projectId: id,
        type: "TEXT_MESSAGE",
        from: "USER",
        contents,
      },
    })
  }

  await prisma.project.update({
    where: { id },
    data: { isGenerating: true, lastActiveAt: new Date() },
  })

  initSse(res)
  const ping = keepAliveSse(res)
  let closed = false
  req.on("close", () => {
    closed = true
  })

  const emitToken = (text: string) => {
    if (!closed) sendSse(res, "token", { text })
  }

  try {
    if (project.phase === "PLANNING") {
      const result = await runIntakeTurnStreaming(id, emitToken)
      if (!result) {
        sendSse(res, "error", { error: "Intake is not available" })
        return
      }
      // Replace any raw ready-JSON suffix the client may have shown mid-stream.
      sendSse(res, "replace", { text: result.visible })
      sendSse(res, "done", {
        message: {
          id: result.messageId,
          from: "ASSISTANT",
          contents: result.visible,
        },
        brief: result.brief,
        title: result.title ?? null,
        phase: "PLANNING",
        isGenerating: false,
      })
      return
    }

    // READY: tool loop (non-stream) then stream final assistant text.
    const result = await generateForProject(id, {
      onToken: emitToken,
      onStatus: (status) => {
        if (!closed) sendSse(res, "status", { status })
      },
    })

    const latest = await prisma.project.findUnique({
      where: { id },
      select: {
        phase: true,
        isGenerating: true,
        brief: true,
        previewUrl: true,
      },
    })

    sendSse(res, "done", {
      message: result.messageId
        ? {
            id: result.messageId,
            from: "ASSISTANT",
            contents: result.contents ?? "",
          }
        : null,
      brief: latest?.brief ?? null,
      phase: latest?.phase ?? "READY",
      isGenerating: false,
      previewUrl: latest?.previewUrl ?? null,
    })
  } catch (error) {
    console.error(`[conversation] ${id}`, error)
    try {
      await prisma.project.update({
        where: { id },
        data: { isGenerating: false },
      })
    } catch {
      // ignore
    }
    if (!closed) {
      sendSse(res, "error", {
        error: "Something went wrong. Try again in chat.",
      })
    }
  } finally {
    clearInterval(ping)
    if (!closed) {
      res.end()
    }
  }
}

export async function setStack(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const parsed = stackSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid request",
      })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    if (project.phase !== "PLANNING") {
      return res.status(409).json({ error: "Stack already chosen" })
    }

    if (!project.brief?.trim()) {
      return res.status(409).json({ error: "Finish clarifying first" })
    }

    if (project.isGenerating) {
      return res.status(409).json({ error: "Still generating" })
    }

    const result = await confirmStackAndBuild(
      id,
      parsed.data.framework,
      parsed.data.language
    )

    if (!result.ok) {
      return res.status(409).json({ error: result.error })
    }

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export async function heartbeat(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    await prisma.project.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    })

    return res.status(200).json({ ok: true })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export async function publish(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    if (!project.previewUrl || !project.sandboxId) {
      return res.status(400).json({ error: "Project is not ready to publish" })
    }

    try {
      await extendSandboxTimeout(project.sandboxId)
    } catch (error) {
      console.error(`[publish] timeout ${id}`, error)
    }

    await prisma.project.update({
      where: { id },
      data: { published: true, lastActiveAt: new Date() },
    })

    return res.status(200).json({ url: project.previewUrl })
  } catch {
    return res.status(500).json({
      error: "Internal server error",
    })
  }
}

export async function restore(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    if (!project.framework || !project.language) {
      return res.status(409).json({ error: "Project has no stack yet" })
    }

    const info = resolveTemplate(project.framework, project.language)

    // Reuse a live sandbox when possible.
    if (project.sandboxId) {
      try {
        const live = await connectSandbox(project.sandboxId)
        await ensureDevServer(live, info.port, info.kind)
        const previewUrl = getPreviewUrl(live, info.port)
        const updated = await prisma.project.update({
          where: { id },
          data: {
            previewUrl,
            phase: "READY",
            lastActiveAt: new Date(),
            isGenerating: false,
          },
        })
        return res.status(200).json({
          id: updated.id,
          title: updated.title,
          previewUrl: updated.previewUrl,
          phase: updated.phase,
          framework: updated.framework,
          language: updated.language,
        })
      } catch (error) {
        console.warn(`[restore] reuse failed ${id}`, error)
        // Drop stale ids so list/get stop probing a dead sandbox.
        await prisma.project.update({
          where: { id },
          data: { sandboxId: null, previewUrl: null },
        })
      }
    }

    // Re-read after possible stale-id clear.
    const latest = await prisma.project.findUnique({ where: { id } })
    if (!latest?.snapshotKey) {
      return res.status(409).json({
        error:
          "Preview expired and no saved snapshot is available for this project. Chat history is still here — ask Zuno to rebuild the site.",
      })
    }
    const snapshotKey = latest.snapshotKey

    const archive = await downloadSnapshot(snapshotKey)
    const created = await createSandboxWithTemplate(
      project.framework,
      project.language
    )
    const { sandbox, template, prebaked } = created

    try {
      await applyProjectSnapshot(sandbox, archive)
      if (!prebaked) {
        await installDependencies(sandbox)
      }
      await ensureDevServer(sandbox, template.port, template.kind)
      const previewUrl = getPreviewUrl(sandbox, template.port)

      const updated = await prisma.project.update({
        where: { id },
        data: {
          sandboxId: sandbox.sandboxId,
          previewUrl,
          phase: "READY",
          lastActiveAt: new Date(),
          isGenerating: false,
        },
      })

      return res.status(200).json({
        id: updated.id,
        title: updated.title,
        previewUrl: updated.previewUrl,
        phase: updated.phase,
        framework: updated.framework,
        language: updated.language,
      })
    } catch (error) {
      try {
        await sandbox.kill()
      } catch {
        // ignore
      }
      throw error
    }
  } catch (error) {
    console.error(`[restore]`, error)
    return res.status(500).json({
      error: "Could not restore project",
    })
  }
}

/** GET /api/v1/project/:id/download — zip of current source */
export async function downloadProject(req: Request, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      return res.status(400).json({ error: "Project id is required" })
    }

    const project = await prisma.project.findUnique({ where: { id } })
    if (!project || project.userId !== req.userId) {
      return res.status(404).json({ error: "Project not found" })
    }

    if (project.phase === "PLANNING") {
      return res.status(409).json({
        error: "Finish planning before downloading the codebase",
      })
    }

    const slug =
      project.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-._]+|[-._]+$/g, "")
        .slice(0, 60) || "zuno-project"

    // Preferred path: same file walk as GitHub push (reliable on live sandbox)
    if (project.sandboxId) {
      try {
        const files = await listProjectFiles(project.sandboxId)
        const paths = Object.keys(files)
        if (paths.length > 0) {
          const zip = new JSZip()
          for (const [path, content] of Object.entries(files)) {
            if (!path || path.includes(" ")) continue
            zip.file(path, content)
          }
          const buffer = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
          })
          const filename = `${slug}.zip`
          res.setHeader("Content-Type", "application/zip")
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
          )
          res.setHeader("Content-Length", String(buffer.byteLength))
          res.setHeader("Cache-Control", "no-store")
          await prisma.project.update({
            where: { id },
            data: { lastActiveAt: new Date() },
          })
          return res.status(200).send(buffer)
        }
      } catch (error) {
        console.error(`[download] zip from sandbox ${id}`, error)
      }
    }

    // Fallback: stored snapshot tarball
    if (project.snapshotKey) {
      try {
        const archive = await downloadSnapshot(project.snapshotKey)
        if (archive && archive.byteLength > 0) {
          const filename = `${slug}.tar.gz`
          res.setHeader("Content-Type", "application/gzip")
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
          )
          res.setHeader("Content-Length", String(archive.byteLength))
          res.setHeader("Cache-Control", "no-store")
          await prisma.project.update({
            where: { id },
            data: { lastActiveAt: new Date() },
          })
          return res.status(200).send(Buffer.from(archive))
        }
      } catch (error) {
        console.error(`[download] snapshot ${id}`, error)
      }
    }

    return res.status(409).json({
      error:
        "No codebase available to download. Open the preview so Zuno can restore the project, then try again.",
    })
  } catch (error) {
    console.error("[download]", error)
    return res.status(500).json({ error: "Could not download project" })
  }
}

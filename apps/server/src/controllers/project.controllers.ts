import { prisma } from "../../db/db"
import crypto from "crypto"
import { generateProject } from "../services/ai"

export async function createProject(req, res) {
  const { prompt } = req.body

  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const project = await prisma.project.create({
    data: {
      name: "Planning project...",
      description: prompt,
      files: {},
      version: 0,
      owner: {
        connect: {
          id: req.user.userId,
        },
      },
      status: "pending",
      filesPlanned: [],
      filesGenerated: [],
      currentFile: null,
      error: null,

      messages: {
        create: [
          {
            role: "user",
            content: prompt,
          },
          {
            role: "assistant",
            content: "Planning project structure...",
          },
        ],
      },
    },
    include: {
      messages: true,
    },
  })

  runBackgroundGeneration(project.id.toString(), prompt).catch((err) => {
    console.error(
      `[Background AI] fatal generation error for project ${project.id}:`,
      err
    )
  })

  res.status(201).json({
    id: project.id,
    name: project.name,
    description: project.description,
    files: {},
    messages: project.messages,
    version: project.version,
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    createdAt: project.createdAt,
  })
}

async function runBackgroundGeneration(projectId, prompt) {
  try {
    console.log(`[Background AI] Starting generation for project ${projectId}`)

    const result = await generateProject(prompt, {
      onPlan: async (plan) => {
        console.log(
          `[Background AI] Plan created for project ${projectId}. Planned ${plan.files.length} files.`
        )

        const fileList = plan.files
          .map((f) => `- \`${f.path}\`: ${f.description}`)
          .join("\n")

        await prisma.project.update({
          where: { id: projectId },
          data: {
            name: plan.projectName || "Generated Project",
            status: "generating",
            filesPlanned: plan.files,
            messages: {
              create: {
                role: "assistant",
                content: `Planned website structure:\n${fileList}`,
                timestamp: new Date(),
              },
            },
          },
        })
      },
      onFileStart: async (path) => {
        console.log(
          `[Background AI] Starting file ${path} for project ${projectId}`
        )
        await prisma.project.update({
          where: { id: projectId },
          data: { currentFile: path },
        })
      },

      onFileComplete: async (path, code) => {
        console.log(
          `[Background AI] Finished file ${path} for project ${projectId}`
        )

        const project = await prisma.project.findFirst(projectId)

        if (project) {
          project.files = project.files || {}
          project.files[path] = { content: code, hash: hashContent(code) }
          project.filesGenerated = [...(project.filesGenerated || []), path]
          project.messages.push({
            role: "assistant",
            content: `Created file "${path}"`,
            timestamp: new Date(),
          })
          project.currentFile = null
          project.markModified("files")
          await project.save()
        }
      },
    })

    console.log(`[Background AI] Successfully generated project ${projectId}`)

    const project = await prisma.project.findFirst(projectId)
    if (project) {
      project.status = "completed"
      project.version = 1
      if (result.description) {
        project.name = result.description
      }
      project.messages.push({
        role: "assistant",
        content: `Website generation complete! You can view and edit the files`,
        timestamp: new Date(),
      })
      await project.save()
    }
  } catch (err) {
    console.error(`[Background AI] Fatal generation error for project ${projectId}:`, err)
    await prisma.project.update({
      where: projectId, data: {
        status: "failed",
        error: err.message,
        $push: {
          messages: {
            role: "assistant",
            content: `Generation failed: ${err.message}`
            timestamp: new Date()
          }
        }
    }})
  }
}

export async function listProjects(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId: req.user.userId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      version: true,
      status: true,
      published: true,
      filesPlanned: true,
      filesGenerated: true,
      currentFile: true,
      error: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return res.json(projects)
}

export async function getProject(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.userId,
    },
    include: {
      messages: {
        orderBy: {
          timestamp: "asc",
        },
      },
    },
  })

  if (!project) {
    return res.status(404).json({
      error: "Project not found",
    })
  }

  const filesObj = {}

  for (const [path, entry] of Object.entries(project.files || {})) {
    if (typeof entry === "object" && entry !== null && "content" in entry) {
      filesObj[path] = entry.content
    } else {
      filesObj[path] = entry
    }
  }

  return res.json({
    id: project.id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    version: project.version,
    status: project.status,
    filesPlanned: project.filesPlanned,
    filesGenerated: project.filesGenerated,
    currentFile: project.currentFile,
    error: project.error,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  })
}

export async function deleteProject(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const result = await prisma.project.delete({
    where: {
      id: req.params.id,
    },
  })
  if (!result) {
    return res.status(404).json({
      error: "Project not found",
    })
  }

  return res.json({ success: true })
}

export async function updateProjectFiles(req, res) {
  const { files } = req.body
  if (!files || typeof files !== "object") {
    return res.status(400).json({
      error: "files object is required",
    })
  }

  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.userId,
    },
  })
  if (!project) {
    return res.status(404).json({
      error: "Project not found",
    })
  }

  const newFiles = {}
  for (const [path, content] of Object.entries(files)) {
    if (typeof content === "string") {
      newFiles[path] = { content, hash: hashContent(content) }
    }
  }

  project.files = newFiles
  await project.save()

  const filesObj = {}
  for (const [path, entry] of Object.entries(project.files)) {
    if (typeof content === "string") {
      filesObj[path] = entry.content
    }
  }

  return res.json({
    id: project.id,
    name: project.name,
    description: project.description,
    files: filesObj,
    messages: project.messages,
    version: project.version,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  })
}

function hashContent(content) {
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 12)
}

export async function publishProject(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
    })
  }

  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.userId,
    },
  })

  if (!project) {
    return res.status(404).json({
      error: "Project not found",
    })
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      published: true,
    },
  })

  return res.json({
    success: true,
    project: updatedProject,
  })
}

export async function getPublicProject(req, res) {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id },
  })

  if (!project) {
    return res.status(404).json({
      error: "Project not found",
    })
  }

  if (!project.published) {
    return res.status(403).json({
      error: "Project is not published yet",
    })
  }

  const filesObj = {}

  for (const [path, entry] of Object.entries(project.files || {})) {
    if (typeof entry === "object" && entry !== null && "content" in entry) {
      filesObj[path] = entry.content
    } else {
      filesObj[path] = entry
    }
  }

  return res.json({
    id: project.id,
    name: project.name,
    description: project.description,
    files: filesObj,
    version: project.version,
  })
}

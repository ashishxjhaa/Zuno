import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { z } from "zod"
import type { Sandbox } from "e2b"
import type { ToolCallKind } from "../generated/prisma/client"
import { prisma } from "./prisma"
import {
  connectSandbox,
  createProjectSandbox,
  deleteProjectFile,
  listProjectFiles,
  readSandboxFile,
  rebuildProject,
  updateProjectFile,
  writeProjectFile,
} from "./e2b"
import { SYSTEM_PROMPT } from "../prompts/system"

const MAX_STEPS = 24
const MAX_REPAIR_STEPS = 12
const MAX_REPAIR_ATTEMPTS = 2

const pathSchema = z.object({ path: z.string().min(1) })
const writeSchema = z.object({
  path: z.string().min(1),
  contents: z.string(),
})

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a project file. Path is relative to the project root.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description: "Create or overwrite a project file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          contents: { type: "string" },
        },
        required: ["path", "contents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateFile",
      description:
        "Replace an existing project file. Fails if the file does not exist.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          contents: { type: "string" },
        },
        required: ["path", "contents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete a project file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
]

const KIND: Record<string, ToolCallKind> = {
  readFile: "READ_FILE",
  writeFile: "WRITE_FILE",
  updateFile: "UPDATE_FILE",
  deleteFile: "DELETE_FILE",
}

function getDeepseek() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set")
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  })
}

// Create the E2B sandbox then run DeepSeek. Used after POST /project returns.
export async function startProjectBuild(projectId: string) {
  try {
    const { sandboxId, previewUrl } = await createProjectSandbox()
    await prisma.project.update({
      where: { id: projectId },
      data: { sandboxId, previewUrl, lastActiveAt: new Date() },
    })
    await generateForProject(projectId)
  } catch (error) {
    console.error(`[bootstrap] ${projectId}`, error)
    try {
      await prisma.conversationHistory.create({
        data: {
          projectId,
          type: "TEXT_MESSAGE",
          from: "ASSISTANT",
          contents: "Could not start the sandbox.",
        },
      })
    } catch {
      // project may already be gone
    }
    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false },
      })
    } catch {
      // ignore
    }
  }
}

// Load project chat, run DeepSeek with file tools, save the assistant reply.
export async function generateForProject(projectId: string) {
  try {
    await runGeneration(projectId)
  } catch (error) {
    console.error(`[generate] ${projectId}`, error)
    await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: "Something went wrong while generating. Try again in chat.",
      },
    })
  } finally {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })
      if (project?.sandboxId) {
        const sandbox = await connectSandbox(project.sandboxId)
        await rebuildUntilOk(projectId, sandbox)
      }
    } catch (error) {
      console.error(`[generate] rebuild failed ${projectId}`, error)
    }

    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false },
      })
    } catch (error) {
      console.error(`[generate] clear flag ${projectId}`, error)
    }
  }
}

// Build; if Vite fails, ask the model to fix exports/TS and retry.
async function rebuildUntilOk(projectId: string, sandbox: Sandbox) {
  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
    const result = await rebuildProject(sandbox)
    if (result.ok) {
      return
    }

    if (attempt === MAX_REPAIR_ATTEMPTS) {
      console.error(`[build] ${projectId} still failing after repairs`)
      await prisma.conversationHistory.create({
        data: {
          projectId,
          type: "TEXT_MESSAGE",
          from: "ASSISTANT",
          contents:
            "The site files were written, but the production build still has errors. Tell me what you see and I’ll fix it.",
        },
      })
      return
    }

    console.log(`[build] ${projectId} repair attempt ${attempt + 1}`)
    await repairBuild(projectId, sandbox, result.error)
  }
}

// Short tool loop that only fixes the given Vite build error.
async function repairBuild(
  projectId: string,
  sandbox: Sandbox,
  buildError: string
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.sandboxId) {
    return
  }

  const files = await listProjectFiles(project.sandboxId)
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Project files:\n${Object.keys(files).sort().join("\n") || "(empty)"}`,
    },
    {
      role: "user",
      content: `The Vite production build failed. Fix ONLY the compile/export errors so \`npx vite build\` succeeds. Use named exports consistently (export function X / import { X }). Do not redesign the site.

Build error:
${buildError.slice(0, 6000)}`,
    },
  ]

  await runToolLoop(projectId, sandbox, messages, MAX_REPAIR_STEPS, {
    saveAssistantText: false,
  })
}

// Connect to the sandbox and loop until DeepSeek replies without tools.
async function runGeneration(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project?.sandboxId) {
    throw new Error("Project has no sandbox")
  }

  const sandbox = await connectSandbox(project.sandboxId)
  const files = await listProjectFiles(project.sandboxId)
  const history = await prisma.conversationHistory.findMany({
    where: { projectId, type: "TEXT_MESSAGE", hidden: false },
    orderBy: { createdAt: "asc" },
  })

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Project files:\n${Object.keys(files).sort().join("\n") || "(empty)"}`,
    },
    ...history.map((row) => ({
      role: (row.from === "USER" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: row.contents,
    })),
  ]

  await runToolLoop(projectId, sandbox, messages, MAX_STEPS, {
    saveAssistantText: true,
  })
}

async function runToolLoop(
  projectId: string,
  sandbox: Sandbox,
  messages: ChatCompletionMessageParam[],
  maxSteps: number,
  options: { saveAssistantText: boolean }
) {
  for (let step = 0; step < maxSteps; step++) {
    const completion = await getDeepseek().chat.completions.create({
      model: "deepseek-v4-flash",
      messages,
      tools,
    })

    const choice = completion.choices[0]?.message
    if (!choice) {
      throw new Error("Empty model response")
    }

    const toolCalls = choice.tool_calls ?? []
    if (toolCalls.length === 0) {
      if (options.saveAssistantText) {
        const text =
          choice.content?.trim() || "Your site is ready. Check the preview."
        await prisma.conversationHistory.create({
          data: {
            projectId,
            type: "TEXT_MESSAGE",
            from: "ASSISTANT",
            contents: text,
          },
        })
      }
      return
    }

    messages.push({
      role: "assistant",
      content: choice.content,
      tool_calls: toolCalls,
    })

    for (const call of toolCalls) {
      if (call.type !== "function") continue
      const result = await runTool(
        sandbox,
        call.function.name,
        call.function.arguments
      )
      await prisma.conversationHistory.create({
        data: {
          projectId,
          type: "TOOL_CALL",
          from: "ASSISTANT",
          hidden: true,
          toolCall: KIND[call.function.name],
          contents: JSON.stringify({
            name: call.function.name,
            arguments: call.function.arguments,
            result,
          }),
        },
      })
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result,
      })
    }
  }

  if (options.saveAssistantText) {
    await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents:
          "Stopped after too many file edits. Check the preview and tell me what to change.",
      },
    })
  }
}

// Run one file tool on the sandbox. Returns a string for the model.
async function runTool(sandbox: Sandbox, name: string, rawArgs: string) {
  try {
    const args = JSON.parse(rawArgs) as unknown
    if (name === "readFile") {
      const { path } = pathSchema.parse(args)
      return await readSandboxFile(sandbox, path)
    }
    if (name === "writeFile") {
      const { path, contents } = writeSchema.parse(args)
      await writeProjectFile(sandbox, path, contents)
      return `Wrote ${path}`
    }
    if (name === "updateFile") {
      const { path, contents } = writeSchema.parse(args)
      await updateProjectFile(sandbox, path, contents)
      return `Updated ${path}`
    }
    if (name === "deleteFile") {
      const { path } = pathSchema.parse(args)
      await deleteProjectFile(sandbox, path)
      return `Deleted ${path}`
    }
    return `Unknown tool: ${name}`
  } catch (error) {
    return error instanceof Error ? error.message : "Tool failed"
  }
}

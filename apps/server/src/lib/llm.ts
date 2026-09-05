import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { z } from "zod"
import type { Sandbox } from "e2b"
import type { ToolCallKind } from "../generated/prisma/client"
import { prisma } from "./prisma"
import {
  connectSandbox,
  createSandboxWithTemplate,
  deleteProjectFile,
  ensureDevServer,
  getPreviewUrl,
  installDependencies,
  listProjectFiles,
  readSandboxFile,
  resolveTemplate,
  updateProjectFile,
  writeProjectFile,
} from "./e2b"
import { buildSystemPrompt } from "../prompts/system"

const MAX_STEPS = 32
const FIRST_BUILD_STEPS = 28

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


/** Emit text in small chunks so the client can animate a live bubble. */
async function emitTextChunks(
  text: string,
  onToken?: (token: string) => void
) {
  if (!onToken || !text) return
  const size = 10
  for (let i = 0; i < text.length; i += size) {
    onToken(text.slice(i, i + size))
    // Yield so SSE frames flush progressively.
    await new Promise((r) => setTimeout(r, 8))
  }
}

export type GenerateStreamHandlers = {
  onToken?: (token: string) => void
  onStatus?: (status: "tools" | "reply") => void
}

export type GenerateStreamResult = {
  messageId: string | null
  contents: string | null
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

// Fast path: prebaked sandbox -> Vite healthy -> preview URL -> LLM edits via HMR.
export async function startProjectBuild(projectId: string) {
  let sandbox: Sandbox | null = null
  const t0 = Date.now()
  try {
    // Phase A: create sandbox + ensureDevServer + set previewUrl/READY.
    // Failures here are real sandbox errors.
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) {
      throw new Error("Project not found")
    }

    const created = await createSandboxWithTemplate(
      project.framework,
      project.language
    )
    sandbox = created.sandbox
    const { template, prebaked } = created
    const sandboxId = sandbox.sandboxId

    // Persist sandbox id only. Do not expose previewUrl until the port is open.
    await prisma.project.update({
      where: { id: projectId },
      data: {
        sandboxId,
        phase: "BUILDING",
        lastActiveAt: new Date(),
      },
    })

    if (!prebaked) {
      await installDependencies(sandbox)
    }

    // Bring Vite/Next up before LLM file churn so the first paint is reliable.
    await ensureDevServer(sandbox, template.port, template.kind)
    const previewUrl = getPreviewUrl(sandbox, template.port)
    console.log(
      `[bootstrap] ${projectId} preview up in ${Date.now() - t0}ms (prebaked=${prebaked})`
    )
    await prisma.project.update({
      where: { id: projectId },
      data: { previewUrl, phase: "READY" },
    })

    // Phase B: generation. On LLM failure keep sandbox + previewUrl alive.
    try {
      await runGeneration(projectId, {
        maxSteps: FIRST_BUILD_STEPS,
        firstPaint: true,
      })

      // LLM may rewrite package.json / vite.config; make sure the listener survived.
      try {
        const live = await connectSandbox(sandboxId)
        await ensureDevServer(live, template.port, template.kind)
      } catch (error) {
        console.error(`[bootstrap] ${projectId} post-gen ensureDevServer`, error)
      }
    } catch (genError) {
      console.error(`[bootstrap] ${projectId} generation`, genError)
      try {
        await prisma.conversationHistory.create({
          data: {
            projectId,
            type: "TEXT_MESSAGE",
            from: "ASSISTANT",
            contents:
              "Preview is up, but generation hit an API error. Try again in chat.",
          },
        })
      } catch {
        // project may already be gone
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { isGenerating: false },
    })
  } catch (error) {
    console.error(`[bootstrap] ${projectId}`, error)
    if (sandbox) {
      try {
        await sandbox.kill()
      } catch {
        // ignore
      }
    }
    const reason =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 500)
        : "Unknown sandbox error"
    const userMessage = reason.toLowerCase().includes("could not start")
      ? reason
      : `Could not start the sandbox. ${reason}`
    try {
      await prisma.conversationHistory.create({
        data: {
          projectId,
          type: "TEXT_MESSAGE",
          from: "ASSISTANT",
          contents: userMessage,
        },
      })
      await prisma.project.update({
        where: { id: projectId },
        data: {
          isGenerating: false,
          previewUrl: null,
          sandboxId: null,
        },
      })
    } catch {
      // project may already be gone
    }
  } finally {
    try {
      const current = await prisma.project.findUnique({
        where: { id: projectId },
        select: { isGenerating: true },
      })
      if (current?.isGenerating) {
        await prisma.project.update({
          where: { id: projectId },
          data: { isGenerating: false },
        })
      }
    } catch {
      // ignore
    }
  }
}

// Chat updates: write files then ensure the HMR server is up.
// Optional handlers stream the final assistant text (tool rounds stay non-stream).
export async function generateForProject(
  projectId: string,
  handlers?: GenerateStreamHandlers
): Promise<GenerateStreamResult> {
  let result: GenerateStreamResult = { messageId: null, contents: null }
  try {
    result = await runGeneration(projectId, undefined, handlers)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })
    if (project?.sandboxId) {
      const info = resolveTemplate(project.framework, project.language)
      const sandbox = await connectSandbox(project.sandboxId)
      await ensureDevServer(sandbox, info.port, info.kind)
    }
  } catch (error) {
    console.error(`[generate] ${projectId}`, error)
    // Do not kill sandbox / clear previewUrl on LLM errors after preview is up.
    const saved = await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: "Something went wrong while generating. Try again in chat.",
      },
    })
    result = {
      messageId: saved.id,
      contents: saved.contents,
    }
    handlers?.onToken?.(saved.contents)
  } finally {
    try {
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false },
      })
    } catch (error) {
      console.error(`[generate] clear flag ${projectId}`, error)
    }
  }
  return result
}

// Connect to the sandbox and loop until DeepSeek replies without tools.
async function runGeneration(
  projectId: string,
  opts?: { maxSteps?: number; firstPaint?: boolean },
  handlers?: GenerateStreamHandlers
): Promise<GenerateStreamResult> {
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

  const system = buildSystemPrompt({
    framework: project.framework,
    language: project.language,
    brief: project.brief,
  })

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    {
      role: "system",
      content: `Project files:\n${Object.keys(files).sort().join("\n") || "(empty)"}`,
    },
  ]

  if (opts?.firstPaint) {
    messages.push({
      role: "system",
      content:
        "First paint: immediately replace the placeholder page (app/page or src/App) so the preview is never left on a blank/building screen. Ship a finished-looking site. Prefer writing the entry page as one complete file first, then split components if steps remain. Match the quality bar (art direction, real copy, nav/hero/sections/footer). Do not change package.json scripts or vite/next server host/port settings.",
    })
  }

  messages.push(
    ...history.map((row) => ({
      role: (row.from === "USER" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: row.contents,
    }))
  )

  return await runToolLoop(
    projectId,
    sandbox,
    messages,
    opts?.maxSteps ?? MAX_STEPS,
    {
      saveAssistantText: true,
      handlers,
      fallbackReply: opts?.firstPaint
        ? "Your site is ready. Check the preview."
        : undefined,
    }
  )
}

/**
 * The final reply is shown verbatim in chat. Self-review and rule-talk
 * (file names, dash/typography lectures, "X is intact") must never reach
 * the user — fall back to a plain completion message instead.
 */
const META_REPLY_HARD_RE =
  /\b[\w.-]+\.(tsx|jsx|ts|js|css|json|html|md)\b|\b(em|en)[\s‐-―-]?dash|\btypograph|\bintact\b|\bthe ban\b/i
const META_REPLY_SOFT_RE =
  /\b(I|I'|me|my|we|no)\b[^.!?]{0,80}\b(rules?|guidelines?|instructions?|bans?|banned|violat\w*|allow(?:ed|able)?|acceptable|permitted)\b/i

function shortenUserFacingReply(
  raw: string,
  fallback = "Done. Check the preview."
) {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim()
  if (
    !cleaned ||
    META_REPLY_HARD_RE.test(cleaned) ||
    META_REPLY_SOFT_RE.test(cleaned)
  ) {
    return fallback
  }
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  const two = parts.slice(0, 2).join(" ").trim()
  if (two.length <= 220) return two
  return `${two.slice(0, 217).trim()}...`
}

async function runToolLoop(
  projectId: string,
  sandbox: Sandbox,
  messages: ChatCompletionMessageParam[],
  maxSteps: number,
  options: {
    saveAssistantText: boolean
    handlers?: GenerateStreamHandlers
    fallbackReply?: string
  }
): Promise<GenerateStreamResult> {
  for (let step = 0; step < maxSteps; step++) {
    // DeepSeek Node SDK: pass thinking as a top-level body field (Python uses extra_body).
    // Disable for codegen tool loops (speed/reliability). Still pass reasoning_content when present.
    // When streaming handlers exist, stream the model turn; tool rounds suppress content tokens.
    const wantStream = Boolean(options.handlers?.onToken)

    let content: string | null = null
    let reasoning_content: string | null | undefined
    let toolCalls: NonNullable<
      OpenAI.Chat.ChatCompletionMessage["tool_calls"]
    > = []

    if (wantStream) {
      const stream = await getDeepseek().chat.completions.create({
        model: "deepseek-v4-flash",
        messages,
        tools,
        stream: true,
        thinking: { type: "disabled" },
      } as OpenAI.Chat.ChatCompletionCreateParamsStreaming)

      let full = ""
      const toolAcc = new Map<
        number,
        { id: string; name: string; arguments: string }
      >()
      let sawTools = false

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta as
          | {
              content?: string | null
              tool_calls?: Array<{
                index?: number
                id?: string
                function?: { name?: string; arguments?: string }
              }>
              reasoning_content?: string | null
            }
          | undefined
        if (!delta) continue

        if (typeof delta.reasoning_content === "string") {
          reasoning_content = (reasoning_content ?? "") + delta.reasoning_content
        }

        if (delta.tool_calls?.length) {
          if (!sawTools) {
            sawTools = true
            options.handlers?.onStatus?.("tools")
          }
          for (const part of delta.tool_calls) {
            const idx = part.index ?? 0
            const prev = toolAcc.get(idx) ?? {
              id: "",
              name: "",
              arguments: "",
            }
            if (part.id) prev.id = part.id
            if (part.function?.name) prev.name += part.function.name
            if (part.function?.arguments) prev.arguments += part.function.arguments
            toolAcc.set(idx, prev)
          }
        }

        if (delta.content) {
          full += delta.content
          // Buffer only. Emit after we know this turn is a final user-facing reply
          // (no tools), and only the shortened text.
        }
      }

      content = full
      toolCalls = [...toolAcc.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, t]) => ({
          id: t.id,
          type: "function" as const,
          function: { name: t.name, arguments: t.arguments },
        }))
    } else {
      const completion = await getDeepseek().chat.completions.create({
        model: "deepseek-v4-flash",
        messages,
        tools,
        thinking: { type: "disabled" },
      } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming)

      const choice = completion.choices[0]?.message
      if (!choice) {
        throw new Error("Empty model response")
      }
      const apiMessage = choice as typeof choice & {
        reasoning_content?: string | null
      }
      content = apiMessage.content
      reasoning_content = apiMessage.reasoning_content
      toolCalls = apiMessage.tool_calls ?? []
    }

    if (toolCalls.length === 0) {
      if (options.saveAssistantText) {
        const text = shortenUserFacingReply(
          content?.trim() ?? "",
          options.fallbackReply
        )
        options.handlers?.onStatus?.("reply")
        await emitTextChunks(text, options.handlers?.onToken)
        const saved = await prisma.conversationHistory.create({
          data: {
            projectId,
            type: "TEXT_MESSAGE",
            from: "ASSISTANT",
            contents: text,
          },
        })
        return { messageId: saved.id, contents: text }
      }
      return { messageId: null, contents: null }
    }

    options.handlers?.onStatus?.("tools")

    messages.push({
      role: "assistant",
      content,
      tool_calls: toolCalls,
      reasoning_content,
    } as ChatCompletionMessageParam)

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
    const text =
      "Stopped after too many file edits. Check the preview and tell me what to change."
    options.handlers?.onStatus?.("reply")
    await emitTextChunks(text, options.handlers?.onToken)
    const saved = await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "ASSISTANT",
        contents: text,
      },
    })
    return { messageId: saved.id, contents: text }
  }
  return { messageId: null, contents: null }
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

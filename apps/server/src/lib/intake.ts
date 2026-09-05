import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import { prisma } from "./prisma"
import { startProjectBuild } from "./llm"
import { INTAKE_SYSTEM_PROMPT } from "../prompts/intake"

type ReadyPayload = {
  ready: true
  brief: string
  title?: string
}

export type IntakeStreamResult = {
  visible: string
  messageId: string
  brief: string | null
  title?: string
}

function getDeepseek() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set")
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    timeout: 60_000,
    maxRetries: 1,
  })
}

/** Pull a trailing ready JSON object from the model reply. */
export function parseReadyPayload(text: string): ReadyPayload | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```\s*$/i)
  const candidate = fenced?.[1]?.trim() ?? (() => {
    const start = text.lastIndexOf("{")
    if (start < 0) return null
    return text.slice(start).trim()
  })()

  if (!candidate) return null

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>
    if (parsed.ready !== true) return null
    const brief = String(parsed.brief ?? "").trim()
    if (!brief) {
      return null
    }
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 80)
        : undefined
    return {
      ready: true,
      brief,
      title,
    }
  } catch {
    return null
  }
}

/** Strip trailing ready JSON (fenced or raw) from user-visible text. */
export function stripReadyMarker(text: string): string {
  let out = text.replace(/```(?:json)?\s*[\s\S]*?```\s*$/i, "").trim()
  if (parseReadyPayload(text)) {
    const start = out.lastIndexOf("{")
    if (start >= 0) {
      const maybe = out.slice(start)
      try {
        const parsed = JSON.parse(maybe) as { ready?: unknown }
        if (parsed.ready === true) {
          out = out.slice(0, start).trim()
        }
      } catch {
        // keep text
      }
    }
  }
  return out || "Got it. Choose a stack below to start building."
}

/**
 * Stream intake clarifying replies token-by-token.
 * onToken receives raw model deltas (may include trailing ready JSON during stream).
 */
export async function runIntakeTurnStreaming(
  projectId: string,
  onToken?: (text: string) => void
): Promise<IntakeStreamResult | null> {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.phase !== "PLANNING") {
    return null
  }

  const history = await prisma.conversationHistory.findMany({
    where: { projectId, type: "TEXT_MESSAGE", hidden: false },
    orderBy: { createdAt: "asc" },
  })

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: INTAKE_SYSTEM_PROMPT },
    ...history.map((row) => ({
      role: (row.from === "USER" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: row.contents,
    })),
  ]

  let raw = ""
  try {
    const stream = await getDeepseek().chat.completions.create({
      model: "deepseek-v4-flash",
      messages,
      stream: true,
      thinking: { type: "disabled" },
    } as OpenAI.Chat.ChatCompletionCreateParamsStreaming)

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (!delta) continue
      raw += delta
      onToken?.(delta)
    }
  } catch (error) {
    console.error(`[intake] stream ${projectId}`, error)
    throw error
  }

  raw = raw.trim() || "Tell me a bit more about what you want to build."
  const ready = parseReadyPayload(raw)
  let visible = ready ? stripReadyMarker(raw) : raw
  // Keep intake chat tight; technical dumps never belong here.
  const sentences = visible.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length > 3) {
    visible = sentences.slice(0, 3).join(" ").trim()
  }

  const saved = await prisma.conversationHistory.create({
    data: {
      projectId,
      type: "TEXT_MESSAGE",
      from: "ASSISTANT",
      contents: visible,
    },
  })

  if (ready) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        phase: "PLANNING",
        isGenerating: false,
        brief: ready.brief,
        ...(ready.title ? { title: ready.title } : {}),
        lastActiveAt: new Date(),
      },
    })
    return {
      visible,
      messageId: saved.id,
      brief: ready.brief,
      title: ready.title,
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { phase: "PLANNING", isGenerating: false, lastActiveAt: new Date() },
  })

  return {
    visible,
    messageId: saved.id,
    brief: null,
  }
}

/** Non-streaming intake (used as fallback). */
export async function runIntakeTurn(projectId: string) {
  try {
    await runIntakeTurnStreaming(projectId)
  } catch (error) {
    console.error(`[intake] ${projectId}`, error)
    try {
      await prisma.conversationHistory.create({
        data: {
          projectId,
          type: "TEXT_MESSAGE",
          from: "ASSISTANT",
          contents:
            "Something went wrong while clarifying. Send another message to continue.",
        },
      })
      await prisma.project.update({
        where: { id: projectId },
        data: { isGenerating: false, phase: "PLANNING" },
      })
    } catch {
      // ignore
    }
  }
}

/** Confirm stack from UI and start the build once. */
export async function confirmStackAndBuild(
  projectId: string,
  framework: "react" | "nextjs",
  language: "javascript" | "typescript"
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project || project.phase !== "PLANNING") {
    return { ok: false as const, error: "Project is not in planning" }
  }
  if (project.isGenerating) {
    return { ok: false as const, error: "Still generating" }
  }

  const brief = project.brief?.trim() || ""
  if (!brief) {
    return { ok: false as const, error: "Finish clarifying first" }
  }

  await prisma.conversationHistory.create({
    data: {
      projectId,
      type: "TEXT_MESSAGE",
      from: "ASSISTANT",
      contents: `Stack locked: ${framework === "nextjs" ? "Next.js" : "React + Vite"} with ${language === "typescript" ? "TypeScript" : "JavaScript"}. Starting the build.`,
    },
  })

  await prisma.project.update({
    where: { id: projectId },
    data: {
      phase: "BUILDING",
      isGenerating: true,
      framework,
      language,
      brief,
      lastActiveAt: new Date(),
    },
  })

  void startProjectBuild(projectId).catch((error) => {
    console.error(`[bootstrap] ${projectId}`, error)
  })

  return { ok: true as const }
}

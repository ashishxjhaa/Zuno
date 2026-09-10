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

type IntakeStreamResult = {
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

const STACK_LOCK_COPY = "Got it. Choose a stack below to start building."

const NOT_AN_IDEA =
  /^(hi|hey|hello|yo|sup|hi there|hello there|thanks|thank you|ok|okay|yes|no|please|help|what(?:'s| is) (this|up)|who are you|what can you do)[\s!?.]*$/i

function isBuildableIdea(text: string): boolean {
  const t = text.trim()
  if (t.length < 3) return false
  return !NOT_AN_IDEA.test(t)
}

function historyHasBuildableIdea(
  history: { from: string; contents: string }[]
): boolean {
  return history.some(
    (row) => row.from === "USER" && isBuildableIdea(row.contents)
  )
}

function briefFromUserTurns(
  history: { from: string; contents: string }[]
): { brief: string; title: string } {
  const parts = history
    .filter((row) => row.from === "USER")
    .map((row) => row.contents.trim())
    .filter(Boolean)
  const brief =
    parts.join("\n\n").trim() ||
    "Build a polished marketing site from the user's idea."
  const title = (parts[0] ?? "New project")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join(" ")
    .slice(0, 80)
  return { brief, title }
}

function readyFromObject(parsed: Record<string, unknown>): ReadyPayload | null {
  if (parsed.ready !== true) return null
  const brief = String(parsed.brief ?? "").trim()
  if (!brief) return null
  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 80)
      : undefined
  return { ready: true, brief, title }
}

// Find the ready JSON block at the end of the model reply
function parseReadyPayload(text: string): ReadyPayload | null {
  const fences = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)]
  for (let i = fences.length - 1; i >= 0; i--) {
    const candidate = fences[i]?.[1]?.trim()
    if (!candidate) continue
    try {
      const parsed = readyFromObject(JSON.parse(candidate) as Record<string, unknown>)
      if (parsed) return parsed
    } catch {
      // try the next code block
    }
  }

  const readyIdx = text.lastIndexOf('"ready"')
  if (readyIdx >= 0) {
    const brace = text.lastIndexOf("{", readyIdx)
    if (brace >= 0) {
      const candidate = text.slice(brace).trim()
      try {
        const parsed = readyFromObject(JSON.parse(candidate) as Record<string, unknown>)
        if (parsed) return parsed
      } catch {
        // ignore
      }
    }
  }

  return null
}

// Remove the ready JSON block from the chat message
function stripReadyMarker(text: string): string {
  let out = text.replace(/```(?:json)?\s*[\s\S]*?```/gi, "").trim()
  const readyIdx = out.lastIndexOf('"ready"')
  if (readyIdx >= 0) {
    const brace = out.lastIndexOf("{", readyIdx)
    if (brace >= 0) {
      const maybe = out.slice(brace)
      try {
        const parsed = JSON.parse(maybe) as { ready?: unknown }
        if (parsed.ready === true) {
          out = out.slice(0, brace).trim()
        }
      } catch {
        out = out.slice(0, brace).trim()
      }
    }
  }
  return out || STACK_LOCK_COPY
}

export async function runIntakeTurnStreaming(
  projectId: string
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
    }
  } catch (error) {
    console.error(`[intake] stream ${projectId}`, error)
    throw error
  }

  raw = raw.trim() || "Tell me a bit more about what you want to build."
  const ready = parseReadyPayload(raw)
  // Any real idea locks immediately. The composer is only for greetings / non-ideas.
  const canLock = Boolean(ready) || historyHasBuildableIdea(history)
  const synthesized = canLock && !ready ? briefFromUserTurns(history) : null
  const lockedBrief = ready?.brief ?? synthesized?.brief ?? null
  const lockedTitle = ready?.title ?? synthesized?.title

  let visible = ready
    ? stripReadyMarker(raw)
    : canLock
      ? STACK_LOCK_COPY
      : raw
  // Cap intake replies at a few sentences
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

  if (lockedBrief) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        phase: "PLANNING",
        isGenerating: false,
        brief: lockedBrief,
        ...(lockedTitle ? { title: lockedTitle } : {}),
        lastActiveAt: new Date(),
      },
    })
    return {
      visible,
      messageId: saved.id,
      brief: lockedBrief,
      title: lockedTitle,
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

// Save the stack choice and start the build
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

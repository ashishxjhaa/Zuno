import axios from "axios"

export function apiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? ""
  return raw
    .trim()
    .replace(/\/$/, "")
    // People often paste ".../api/v1". Paths already include /api/v1.
    .replace(/\/api\/v1$/i, "")
}

export const frontend = axios.create({
  baseURL: apiBaseUrl(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
})

export type ProjectFramework = "react" | "nextjs"
export type ProjectLanguage = "javascript" | "typescript"
export type ProjectPhase = "PLANNING" | "BUILDING" | "READY"

export type StreamChatMessage = {
  id: string
  from: "USER" | "ASSISTANT"
  contents: string
}

export type ConversationStreamDone = {
  message: StreamChatMessage | null
  brief: string | null
  title?: string | null
  phase: ProjectPhase
  isGenerating: boolean
  previewUrl?: string | null
}

export type ConversationStreamHandlers = {
  onToken?: (text: string) => void
  onReplace?: (text: string) => void
  onStatus?: (status: string) => void
  onDone?: (payload: ConversationStreamDone) => void
  signal?: AbortSignal
}

function parseSseChunk(buffer: string): { events: { event: string; data: string }[]; rest: string } {
  const parts = buffer.split("\n\n")
  const rest = parts.pop() ?? ""
  const events: { event: string; data: string }[] = []
  for (const part of parts) {
    if (!part.trim() || part.startsWith(":")) continue
    let event = "message"
    const dataLines: string[] = []
    for (const line of part.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim()
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (dataLines.length) {
      events.push({ event, data: dataLines.join("\n") })
    }
  }
  return { events, rest }
}

// Stream intake or post-build chat replies over SSE
export async function streamConversation(
  projectId: string,
  body: { contents?: string; resume?: boolean },
  handlers: ConversationStreamHandlers = {}
) {
  const res = await fetch(`${apiBaseUrl()}/api/v1/project/${projectId}/conversation`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: handlers.signal,
  })

  if (!res.ok) {
    let message = "Something went wrong"
    try {
      const json = (await res.json()) as { error?: string }
      if (typeof json.error === "string") message = json.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (!res.body) {
    throw new Error("No response body")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let sawDone = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseChunk(buffer)
    buffer = parsed.rest
    for (const evt of parsed.events) {
      let payload: unknown = null
      try {
        payload = JSON.parse(evt.data)
      } catch {
        continue
      }
      if (evt.event === "token") {
        const text = (payload as { text?: string }).text
        if (typeof text === "string" && text) handlers.onToken?.(text)
      } else if (evt.event === "replace") {
        const text = (payload as { text?: string }).text
        if (typeof text === "string") handlers.onReplace?.(text)
      } else if (evt.event === "status") {
        const status = (payload as { status?: string }).status
        if (typeof status === "string") handlers.onStatus?.(status)
      } else if (evt.event === "done") {
        sawDone = true
        handlers.onDone?.(payload as ConversationStreamDone)
      } else if (evt.event === "error") {
        const err = (payload as { error?: string }).error || "Stream error"
        throw new Error(err)
      }
    }
  }

  if (!sawDone) {
    throw new Error("Stream ended early")
  }
}

export async function confirmProjectStack(
  projectId: string,
  framework: ProjectFramework,
  language: ProjectLanguage
) {
  return frontend.post(`/api/v1/project/${projectId}/stack`, {
    framework,
    language,
  })
}

export type ProjectListItem = {
  id: string
  title: string
  phase: ProjectPhase
  framework: string | null
  language: string | null
  snapshotAt: string | null
  lastActiveAt: string
  updatedAt: string
}

export async function listProjects() {
  return frontend.get<{ projects: ProjectListItem[] }>("/api/v1/project")
}

export async function restoreProject(projectId: string) {
  return frontend.post<{
    id: string
    title: string
    previewUrl: string | null
    phase: ProjectPhase
    framework: string | null
    language: string | null
  }>(`/api/v1/project/${projectId}/restore`)
}

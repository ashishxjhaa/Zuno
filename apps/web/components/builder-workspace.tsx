"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CodeXmlIcon, EyeIcon, GlobeIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"
import { toast } from "sonner"
import { BuilderSkeleton, rememberBuilderPhase } from "@/components/builder-skeleton"
import { ChatPanel, type ChatMessage } from "@/components/chat-panel"
import { CodeViewer } from "@/components/code-viewer"
import { GeneratingOverlay } from "@/components/generating-overlay"
import { PreviewPanel } from "@/components/preview-panel"
import {
  confirmProjectStack,
  frontend,
  streamConversation,
  type ProjectFramework,
  type ProjectLanguage,
  type ProjectPhase,
} from "@/lib/api"
import { useSession } from "@/lib/session"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const TABS = ["Preview", "Code"] as const
const CHAT_WIDTH = 380
const POLL_MS = 2000
const HEARTBEAT_MS = 30_000

type ProjectPayload = {
  previewUrl: string | null
  isGenerating: boolean
  published: boolean
  phase: ProjectPhase
  framework: string | null
  language: string | null
  brief: string | null
  messages: ChatMessage[]
  files: Record<string, string>
}

function toastApiError(error: unknown) {
  const err = (error as { response?: { data?: { error?: unknown } } }).response
    ?.data?.error
  if (typeof err === "string") {
    toast.error(err)
    return
  }
  if (error instanceof Error && error.message) {
    toast.error(error.message)
    return
  }
  toast.error("Something went wrong")
}

export function BuilderWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { user, isLoading } = useSession()
  const [tab, setTab] = useState<(typeof TABS)[number]>("Preview")
  const [project, setProject] = useState<ProjectPayload | null>(null)
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [stackBusy, setStackBusy] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [previewRevision, setPreviewRevision] = useState(0)
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [streamStatus, setStreamStatus] = useState<"tools" | "reply" | null>(
    null
  )
  const goneRef = useRef(false)
  const streamingRef = useRef(false)
  const resumeAttemptedRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const stackBusyRef = useRef(false)

  useEffect(() => {
    try {
      const key = `zuno:prompt:${projectId}`
      const saved = sessionStorage.getItem(key)
      if (saved) {
        setSeedPrompt(saved)
        sessionStorage.removeItem(key)
      }
    } catch {
      // ignore
    }
  }, [projectId])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/signin")
    }
  }, [isLoading, user, router])

  const loadProject = useCallback(async () => {
    try {
      const res = await frontend.get<ProjectPayload>(`/api/v1/project/${projectId}`)
      setProject((current) => {
        // Avoid clobbering optimistic user message / live stream bubble.
        if (streamingRef.current && current) {
          return {
            ...res.data,
            messages: current.messages.length > res.data.messages.length
              ? current.messages
              : res.data.messages,
            isGenerating: true,
          }
        }
        // Keep optimistic BUILDING if poll is still on PLANNING mid-confirm.
        if (
          stackBusyRef.current &&
          current?.phase === "BUILDING" &&
          res.data.phase === "PLANNING"
        ) {
          return {
            ...res.data,
            phase: "BUILDING",
            isGenerating: true,
            framework: current.framework,
            language: current.language,
          }
        }
        return res.data
      })
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } }).response
        ?.status
      if (status === 404) {
        goneRef.current = true
        toast.error("Project not found")
        router.push("/")
        return
      }
      toastApiError(error)
    }
  }, [projectId, router])

  useEffect(() => {
    if (!user) {
      return
    }
    void loadProject()
  }, [user, loadProject])

  useEffect(() => {
    if (project?.phase) {
      rememberBuilderPhase(projectId, project.phase)
    }
  }, [project?.phase, projectId])

  const shouldPoll =
    !streamingRef.current &&
    (!project ||
      project.isGenerating ||
      project.phase === "PLANNING" ||
      project.phase === "BUILDING")

  useEffect(() => {
    if (!user || !shouldPoll) {
      return
    }
    const timer = window.setInterval(() => {
      if (!goneRef.current && !streamingRef.current) {
        void loadProject()
      }
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [user, shouldPoll, loadProject])

  useEffect(() => {
    if (project && !project.isGenerating && project.previewUrl) {
      setPreviewRevision((rev) => rev + 1)
    }
  }, [project?.isGenerating, project?.previewUrl])

  useEffect(() => {
    if (!user) {
      return
    }
    const beat = () => {
      void frontend.post(`/api/v1/project/${projectId}/heartbeat`).catch(() => {})
    }
    beat()
    const timer = window.setInterval(beat, HEARTBEAT_MS)
    return () => window.clearInterval(timer)
  }, [user, projectId])

  const runStream = useCallback(
    async (body: { contents?: string; resume?: boolean }) => {
      if (streamingRef.current) return
      streamingRef.current = true
      setStreamingText("")
      setStreamStatus(null)
      const ac = new AbortController()
      abortRef.current = ac

      setProject((current) =>
        current
          ? {
              ...current,
              isGenerating: true,
              messages:
                body.contents && !body.resume
                  ? [
                      ...current.messages,
                      {
                        id: `local-${Date.now()}`,
                        from: "USER",
                        contents: body.contents,
                      },
                    ]
                  : current.messages,
            }
          : current
      )

      try {
        await streamConversation(projectId, body, {
          signal: ac.signal,
          onToken: (text) => {
            setStreamStatus("reply")
            setStreamingText((prev) => (prev ?? "") + text)
          },
          onReplace: (text) => {
            setStreamStatus("reply")
            setStreamingText(text)
          },
          onStatus: (status) => {
            if (status === "tools") {
              setStreamStatus("tools")
              // Hide any premature text if the model switched into tool calls.
              setStreamingText("")
            } else if (status === "reply") {
              setStreamStatus("reply")
            }
          },
          onDone: (payload) => {
            setStreamingText(null)
            setStreamStatus(null)
            setProject((current) => {
              if (!current) return current
              const messages = [...current.messages]
              if (
                payload.message &&
                !messages.some((m) => m.id === payload.message!.id)
              ) {
                messages.push(payload.message)
              }
              return {
                ...current,
                isGenerating: false,
                phase: payload.phase,
                brief: payload.brief ?? current.brief,
                previewUrl: payload.previewUrl ?? current.previewUrl,
                messages,
              }
            })
          },
        })
        streamingRef.current = false
        await loadProject()
      } catch (error) {
        const name = (error as { name?: string }).name
        if (name === "AbortError") {
          // Allow a fresh resume after Strict Mode remount / navigation abort.
          streamingRef.current = false
          throw error
        }
        toastApiError(error)
        setStreamingText(null)
        setStreamStatus(null)
        setProject((current) =>
          current ? { ...current, isGenerating: false } : current
        )
        streamingRef.current = false
        await loadProject()
        throw error
      } finally {
        streamingRef.current = false
        abortRef.current = null
        setStreamingText(null)
        setStreamStatus(null)
      }
    },
    [projectId, loadProject]
  )

  const phaseForResume = project?.phase
  const generatingForResume = project?.isGenerating
  const resumeMessages = project?.messages
  const lastFromForResume = resumeMessages?.[resumeMessages.length - 1]?.from
  const messageCountForResume = resumeMessages?.length ?? 0

  // After create: resume pending intake once so the first clarifying reply streams.
  // Do not depend on the whole project object (poll updates would retrigger).
  useEffect(() => {
    if (!user) return
    if (resumeAttemptedRef.current) return
    if (phaseForResume !== "PLANNING") return
    if (!generatingForResume) return
    if (streamingRef.current) return
    if (lastFromForResume === "ASSISTANT") return

    resumeAttemptedRef.current = true
    let cancelled = false

    void (async () => {
      try {
        await runStream({ resume: true })
      } catch (error) {
        if (cancelled) return
        const name = (error as { name?: string }).name
        const message = error instanceof Error ? error.message : ""
        // Retry only after abort (Strict Mode). Never loop on 409 conflicts.
        if (name === "AbortError") {
          resumeAttemptedRef.current = false
          return
        }
        if (
          message.includes("Still generating") ||
          message.includes("Nothing to resume")
        ) {
          // Keep attempted=true; polling will refresh state.
          return
        }
        resumeAttemptedRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    user,
    phaseForResume,
    generatingForResume,
    lastFromForResume,
    messageCountForResume,
    runStream,
  ])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [projectId])

  const sendMessage = async (contents: string) => {
    try {
      await runStream({ contents })
    } catch (error) {
      throw error
    }
  }

  const onConfirmStack = async (
    framework: ProjectFramework,
    language: ProjectLanguage
  ) => {
    if (stackBusy) return
    setStackBusy(true)
    stackBusyRef.current = true
    // Optimistic: switch to split layout immediately (do not wait for API).
    setChatCollapsed(false)
    setPreviewReady(false)
    setProject((current) =>
      current
        ? {
            ...current,
            phase: "BUILDING",
            isGenerating: true,
            framework,
            language,
          }
        : current
    )
    try {
      await confirmProjectStack(projectId, framework, language)
      toast.success("Building with your stack")
      await loadProject()
    } catch (error) {
      setProject((current) =>
        current
          ? { ...current, phase: "PLANNING", isGenerating: false }
          : current
      )
      toastApiError(error)
    } finally {
      stackBusyRef.current = false
      setStackBusy(false)
    }
  }
  const onPublish = async () => {
    if (publishing) {
      return
    }
    setPublishing(true)
    try {
      const res = await frontend.post<{ url: string }>(
        `/api/v1/project/${projectId}/publish`
      )
      const url = res.data.url
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // toast still shows the URL
      }
      toast.success(url)
      window.open(url, "_blank", "noopener,noreferrer")
      setProject((current) =>
        current ? { ...current, published: true } : current
      )
    } catch (error) {
      toastApiError(error)
    } finally {
      setPublishing(false)
    }
  }

  if (!user) {
    return null
  }

  if (!project) {
    return <BuilderSkeleton projectId={projectId} />
  }

  const phase = project.phase
  const planning = phase === "PLANNING"
  const generating =
    (project?.isGenerating ?? true) || streamingText !== null
  const briefLocked = Boolean(project?.brief?.trim())
  const messages = (() => {
    const raw =
      project?.messages && project.messages.length > 0
        ? project.messages
        : seedPrompt
          ? [{ id: "seed", from: "USER" as const, contents: seedPrompt }]
          : []
    const seen = new Set<string>()
    const out: ChatMessage[] = []
    for (const message of raw) {
      if (!message?.id || seen.has(message.id)) continue
      seen.add(message.id)
      out.push({
        id: message.id,
        from: message.from,
        contents: message.contents ?? "",
      })
    }
    return out
  })()
  const chatCooking =
    generating && messages.some((message) => message.from === "USER")
  // Keep the mark over the iframe until generation is done and the preview has loaded.
  const showOverlay =
    !planning && (generating || !project?.previewUrl || !previewReady)
  const workspaceLocked = showOverlay
  const splitChatWidth = chatCollapsed ? 0 : CHAT_WIDTH

  const chat = (
    <ChatPanel
      messages={messages}
      cooking={chatCooking}
      onSend={sendMessage}
      planning={planning}
      stackVisible={planning && briefLocked}
      stackBusy={stackBusy}
      onConfirmStack={planning && briefLocked ? onConfirmStack : undefined}
      centered={planning}
      streamingText={streamingText}
      streamStatus={streamStatus}
    />
  )

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Chat: full centered in planning, animates to left rail on build */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-10 flex min-h-0 flex-col transition-[width,padding,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            planning
              ? "w-full px-4"
              : cn(
                  "px-0",
                  chatCollapsed && "pointer-events-none overflow-hidden opacity-0"
                )
          )}
          style={{ width: planning ? "100%" : splitChatWidth }}
        >
          <div
            className={cn(
              "flex h-full min-h-0 w-full flex-col transition-[max-width,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              planning ? "mx-auto max-w-2xl" : "mx-0 max-w-none"
            )}
          >
            {chat}
          </div>
        </div>

        {!planning && !chatCollapsed ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-30 w-0 border-r border-border"
            style={{ left: splitChatWidth }}
          />
        ) : null}

        {/* Preview: slides/fades in from the right (no hard cut) */}
        <section
          aria-hidden={planning}
          className={cn(
            "absolute inset-y-0 right-0 flex min-h-0 flex-col bg-background transition-[opacity,transform,left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            planning
              ? "pointer-events-none translate-x-8 opacity-0"
              : "translate-x-0 opacity-100"
          )}
          style={{ left: planning ? CHAT_WIDTH : splitChatWidth }}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5">
              {!planning ? (
                <button
                  type="button"
                  aria-label={chatCollapsed ? "Show chat" : "Hide chat"}
                  onClick={() => setChatCollapsed((value) => !value)}
                  className={cn(
                    "inline-flex size-8 cursor-pointer items-center justify-center rounded-sm border border-border text-zinc-600 transition-colors hover:bg-muted hover:text-foreground"
                  )}
                >
                  {chatCollapsed ? (
                    <PanelLeftOpenIcon className="size-3.5" />
                  ) : (
                    <PanelLeftCloseIcon className="size-3.5" />
                  )}
                </button>
              ) : null}
              {TABS.map((item) => {
                const Icon = item === "Preview" ? EyeIcon : CodeXmlIcon
                const active = tab === item
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={workspaceLocked}
                    onClick={() => setTab(item)}
                    className={cn(
                      "cursor-pointer",
                      buttonVariants({ size: "sm" }),
                      "gap-1.5 rounded-sm",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                      workspaceLocked &&
                        "pointer-events-none cursor-not-allowed opacity-40 hover:bg-transparent"
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              disabled={workspaceLocked || publishing || !project?.previewUrl}
              onClick={() => void onPublish()}
              className={cn(
                "cursor-pointer",
                buttonVariants({ size: "sm" }),
                "cursor-pointer gap-1.5 rounded-sm bg-[#ff5800] text-white hover:bg-[#e04e00]",
                (workspaceLocked || publishing || !project?.previewUrl) &&
                  "pointer-events-none cursor-not-allowed opacity-40 hover:bg-[#ff5800]"
              )}
            >
              <GlobeIcon className="size-3.5" />
              Publish
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div
              className={cn("absolute inset-0", tab !== "Preview" && "hidden")}
            >
              <PreviewPanel
                src={
                  project?.previewUrl
                    ? `${project.previewUrl}?v=${previewRevision}`
                    : null
                }
                onReady={setPreviewReady}
              />
            </div>
            <div
              className={cn("absolute inset-0", tab !== "Code" && "hidden")}
            >
              <CodeViewer files={project?.files ?? {}} />
            </div>
            {showOverlay ? <GeneratingOverlay /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}

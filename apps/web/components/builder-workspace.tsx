"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"
import { useRouter } from "next/navigation"
import { CodeXmlIcon, EyeIcon, GlobeIcon } from "lucide-react"
import { toast } from "sonner"
import { ChatPanel, type ChatMessage } from "@/components/chat-panel"
import { CodeViewer } from "@/components/code-viewer"
import { GeneratingOverlay } from "@/components/generating-overlay"
import { PreviewPanel } from "@/components/preview-panel"
import { SiteHeader } from "@/components/site-header"
import { frontend } from "@/lib/api"
import { useSession } from "@/lib/session"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const TABS = ["Preview", "Code"] as const
const MIN_CHAT = 280
const MAX_CHAT = 560
const DEFAULT_CHAT = 380
const POLL_MS = 2000
const HEARTBEAT_MS = 30_000

type ProjectPayload = {
  previewUrl: string | null
  isGenerating: boolean
  published: boolean
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
  toast.error("Something went wrong")
}

export function BuilderWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { user, isLoading } = useSession()
  const [tab, setTab] = useState<(typeof TABS)[number]>("Preview")
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT)
  const [project, setProject] = useState<ProjectPayload | null>(null)
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const goneRef = useRef(false)

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

  const onDividerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current || !frameRef.current) {
        return
      }
      const left = frameRef.current.getBoundingClientRect().left
      const next = Math.min(MAX_CHAT, Math.max(MIN_CHAT, event.clientX - left))
      setChatWidth(next)
    }

    const onUp = () => {
      draggingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/signin")
    }
  }, [isLoading, user, router])

  const loadProject = useCallback(async () => {
    try {
      const res = await frontend.get<ProjectPayload>(`/api/v1/project/${projectId}`)
      setProject(res.data)
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
    if (!user) {
      return
    }
    if (project && !project.isGenerating) {
      return
    }
    const timer = window.setInterval(() => {
      if (!goneRef.current) {
        void loadProject()
      }
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [user, project?.isGenerating, loadProject])

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

  const sendMessage = async (contents: string) => {
    try {
      await frontend.post(`/api/v1/project/${projectId}/conversation`, {
        contents,
      })
      setProject((current) =>
        current
          ? {
              ...current,
              isGenerating: true,
              messages: [
                ...current.messages,
                { id: `local-${Date.now()}`, from: "USER", contents },
              ],
            }
          : current
      )
    } catch (error) {
      toastApiError(error)
      throw error
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

  const generating = project?.isGenerating ?? true
  const messages =
    project?.messages && project.messages.length > 0
      ? project.messages
      : seedPrompt
        ? [{ id: "seed", from: "USER" as const, contents: seedPrompt }]
        : []
  const chatCooking = generating && messages.some((message) => message.from === "USER")

  return (
    <div className="flex h-screen flex-col bg-background">
      <SiteHeader wide />
      <div ref={frameRef} className="flex min-h-0 flex-1 pt-14">
        <div className="h-full min-h-0 shrink-0" style={{ width: chatWidth }}>
          <ChatPanel
            messages={messages}
            cooking={chatCooking}
            onSend={sendMessage}
          />
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat and preview"
          onPointerDown={onDividerDown}
          className="relative z-10 w-4 shrink-0 cursor-col-resize touch-none"
        >
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-[2px] -translate-x-1/2"
            preserveAspectRatio="none"
          >
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="100%"
              stroke="#f5af19"
              strokeWidth="2"
              strokeDasharray="1.5 7"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex gap-1.5">
              {TABS.map((item) => {
                const Icon = item === "Preview" ? EyeIcon : CodeXmlIcon
                const active = tab === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "gap-1.5",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border-white/15 bg-transparent text-muted-foreground hover:bg-white/8 hover:text-foreground"
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
              disabled={publishing || !project?.previewUrl}
              onClick={() => void onPublish()}
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <GlobeIcon className="size-3.5" />
              Publish
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            {tab === "Preview" ? (
              <PreviewPanel src={project?.previewUrl ?? null} />
            ) : (
              <CodeViewer files={project?.files ?? {}} />
            )}
            {generating ? <GeneratingOverlay /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}

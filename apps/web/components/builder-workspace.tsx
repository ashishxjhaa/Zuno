"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CodeXmlIcon,
  EyeIcon,
  GlobeIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react"
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
const CHAT_WIDTH = 380
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
  const [chatOpen, setChatOpen] = useState(true)
  const [project, setProject] = useState<ProjectPayload | null>(null)
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [previewRevision, setPreviewRevision] = useState(0)
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

  // Bump preview revision when a generation finishes so the iframe reloads fresh.
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
      <div className="flex min-h-0 flex-1 pt-14">
        {chatOpen ? (
          <div className="h-full min-h-0 shrink-0" style={{ width: CHAT_WIDTH }}>
            <ChatPanel
              messages={messages}
              cooking={chatCooking}
              onSend={sendMessage}
            />
          </div>
        ) : null}

        <div className="relative z-10 flex w-8 shrink-0 items-center justify-center">
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
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            aria-label={chatOpen ? "Hide chat" : "Show chat"}
            aria-pressed={chatOpen}
            className="relative z-10 flex size-7 items-center justify-center rounded-md border border-[#f5af19]/40 bg-[#0a0a09] text-[#f5af19] transition-colors hover:bg-[#f5af19]/15"
          >
            {chatOpen ? (
              <PanelLeftCloseIcon className="size-3.5" />
            ) : (
              <PanelLeftOpenIcon className="size-3.5" />
            )}
          </button>
        </div>

        <section className="relative flex min-w-0 flex-1 flex-col bg-[#0a0a09]">
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
            <div className={cn("absolute inset-0", tab !== "Preview" && "hidden")}>
              <PreviewPanel
                src={project?.previewUrl ? `${project.previewUrl}?v=${previewRevision}` : null}
              />
            </div>
            <div className={cn("absolute inset-0", tab !== "Code" && "hidden")}>
              <CodeViewer files={project?.files ?? {}} />
            </div>
            {generating ? <GeneratingOverlay /> : null}
          </div>
        </section>
      </div>
    </div>
  )
}

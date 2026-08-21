"use client"

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react"
import { useRouter } from "next/navigation"
import { CodeXmlIcon, EyeIcon, GlobeIcon } from "lucide-react"
import { ChatPanel } from "@/components/chat-panel"
import { CodeViewer } from "@/components/code-viewer"
import { PreviewPanel } from "@/components/preview-panel"
import { SiteHeader } from "@/components/site-header"
import { useSession } from "@/lib/session"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const TABS = ["Preview", "Code"] as const
const MIN_CHAT = 280
const MAX_CHAT = 560
const DEFAULT_CHAT = 380

export function BuilderWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter()
  const { user, isLoading } = useSession()
  const [tab, setTab] = useState<(typeof TABS)[number]>("Preview")
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT)
  const frameRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

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

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <SiteHeader wide />
      <div ref={frameRef} className="flex min-h-0 flex-1 pt-14">
        <div className="h-full min-h-0 shrink-0" style={{ width: chatWidth }}>
          <ChatPanel />
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
              className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
            >
              <GlobeIcon className="size-3.5" />
              Publish
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            {tab === "Preview" ? (
              <PreviewPanel src={null} />
            ) : (
              <CodeViewer files={{}} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

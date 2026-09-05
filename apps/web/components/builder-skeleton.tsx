"use client"

import { useEffect, useState } from "react"
import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@workspace/ui/components/skeleton"

const CHAT_WIDTH = 380
const PHASE_KEY = (id: string) => `zuno:phase:${id}`
const SEED_KEY = (id: string) => `zuno:prompt:${id}`

export function rememberBuilderPhase(projectId: string, phase: string) {
  try {
    sessionStorage.setItem(PHASE_KEY(projectId), phase)
  } catch {
    // ignore
  }
}

function ChatThreadSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={compact ? "space-y-5 px-3 py-4" : "space-y-6 px-4 py-4"}>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[58%] rounded-sm" />
        </div>
        <div className="flex items-start gap-2.5">
          <Skeleton className="size-[22px] shrink-0 rounded-sm" />
          <Skeleton className="h-16 w-[72%] rounded-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[42%] rounded-sm" />
        </div>
        <div className="flex items-start gap-2.5">
          <Skeleton className="size-[22px] shrink-0 rounded-sm" />
          <Skeleton className="h-20 w-[78%] rounded-sm" />
        </div>
      </div>
      <div className={compact ? "mt-auto p-3" : "mt-auto px-0 pb-4"}>
        <Skeleton className={compact ? "h-12 w-full rounded-sm" : "h-[98px] w-full rounded-sm"} />
      </div>
    </div>
  )
}

function PlanningSkeleton() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 pt-4">
      <ChatThreadSkeleton />
    </div>
  )
}

function SplitSkeleton() {
  return (
    <>
      <div
        className="absolute bottom-0 left-0 top-14 z-10 flex min-h-0 flex-col border-r border-border"
        style={{ width: CHAT_WIDTH }}
      >
        <ChatThreadSkeleton compact />
      </div>
      <section
        className="absolute bottom-0 right-0 top-14 flex min-h-0 flex-col border-l border-border bg-background"
        style={{ left: CHAT_WIDTH }}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="size-8 rounded-sm" />
            <Skeleton className="h-8 w-[72px] rounded-sm" />
            <Skeleton className="h-8 w-[60px] rounded-sm" />
          </div>
          <Skeleton className="h-8 w-[88px] rounded-sm" />
        </div>
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="size-24 rounded-sm" />
          </div>
        </div>
      </section>
    </>
  )
}

export function BuilderSkeleton({ projectId }: { projectId: string }) {
  const [planning, setPlanning] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(PHASE_KEY(projectId))
      const seeded = Boolean(sessionStorage.getItem(SEED_KEY(projectId)))
      setPlanning(stored ? stored === "PLANNING" : seeded)
    } catch {
      setPlanning(false)
    }
  }, [projectId])

  return (
    <div className="flex h-screen flex-col bg-background">
      <SiteHeader wide />
      <div className="relative flex min-h-0 flex-1 overflow-hidden pt-14">
        {planning ? <PlanningSkeleton /> : <SplitSkeleton />}
      </div>
    </div>
  )
}

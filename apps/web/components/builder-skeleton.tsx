"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
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

function SkeletonAvatarRow({
  align = "start",
  wide = false,
}: {
  align?: "start" | "end"
  wide?: boolean
}) {
  if (align === "end") {
    return (
      <div className="flex justify-end">
        <div className="space-y-2">
          <Skeleton className={wide ? "h-4 w-[220px]" : "h-4 w-[160px]"} />
          <Skeleton className="h-4 w-[120px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="space-y-2">
        <Skeleton className={wide ? "h-4 w-[250px]" : "h-4 w-[180px]"} />
        <Skeleton className="h-4 w-[200px] max-w-full" />
      </div>
    </div>
  )
}

function ChatPaneSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={compact ? "flex-1 space-y-6 px-4 py-5" : "flex-1 space-y-6 px-4 py-4"}>
        <SkeletonAvatarRow align="end" wide={!compact} />
        <SkeletonAvatarRow wide={!compact} />
        <SkeletonAvatarRow align="end" />
        <SkeletonAvatarRow />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className={compact ? "p-3" : "px-0 pb-4"}>
        <Skeleton className={compact ? "h-12 w-full" : "h-[98px] w-full"} />
      </div>
    </div>
  )
}

function PlanningSkeleton() {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-4 pt-4">
      <ChatPaneSkeleton />
    </div>
  )
}

function SplitSkeleton() {
  return (
    <>
      <div
        className="absolute inset-y-0 left-0 z-10 flex min-h-0 flex-col"
        style={{ width: CHAT_WIDTH }}
      >
        <ChatPaneSkeleton compact />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-30 w-0 border-r border-border"
        style={{ left: CHAT_WIDTH }}
      />
      <section
        className="absolute inset-y-0 right-0 flex min-h-0 flex-col bg-background"
        style={{ left: CHAT_WIDTH }}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="h-8 w-[168px] rounded-sm" />
          </div>
          <Skeleton className="h-8 w-[88px]" />
        </div>
        <div className="min-h-0 flex-1 p-4">
          <Card className="h-full gap-4 py-4">
            <CardHeader className="px-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-4">
              <Skeleton className="h-full min-h-[240px] w-full" />
            </CardContent>
          </Card>
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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {planning ? <PlanningSkeleton /> : <SplitSkeleton />}
      </div>
    </div>
  )
}

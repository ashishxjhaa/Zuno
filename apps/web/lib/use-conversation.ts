"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { conversationSchema } from "@workspace/shared"
import type { ConversationItem, ProjectDetail } from "@workspace/shared"
import {
  appendConversation,
  finishConversation,
  finishGenerating,
  getProject,
} from "@/lib/projects"

export function useConversation(projectId: string) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [isReady, setIsReady] = useState(false)

  const reload = useCallback(() => {
    setProject(getProject(projectId))
    setIsReady(true)
  }, [projectId])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!project?.isGenerating) {
      return
    }

    const isFirstPass = !project.conversationHistory.some(
      (item) => item.from === "ASSISTANT"
    )

    const timer = window.setTimeout(() => {
      const next = isFirstPass
        ? finishGenerating(projectId)
        : finishConversation(projectId)
      if (next) {
        setProject(next)
      }
    }, 2800)

    return () => window.clearTimeout(timer)
  }, [project?.isGenerating, project?.conversationHistory, projectId])

  const messages = useMemo(
    () =>
      (project?.conversationHistory ?? []).filter(
        (item: ConversationItem) =>
          item.type === "TEXT_MESSAGE" && !item.hidden
      ),
    [project]
  )

  const send = useCallback(
    (raw: string) => {
      const parsed = conversationSchema.safeParse({ contents: raw })
      if (!parsed.success) {
        return parsed.error.issues[0]?.message ?? "Message cannot be empty"
      }

      const next = appendConversation(projectId, parsed.data.contents)
      if (next) {
        setProject(next)
      }

      return null
    },
    [projectId]
  )

  return {
    project,
    messages,
    send,
    isGenerating: project?.isGenerating ?? false,
    isReady,
    reload,
  }
}

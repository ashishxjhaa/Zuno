"use client"

import { useCallback, useEffect, useState } from "react"
import type { ProjectSummary } from "@workspace/shared"
import { createProject, listProjects } from "@/lib/projects"

export function useProjects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])

  const refresh = useCallback(() => {
    setProjects(listProjects())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const create = useCallback((initialPrompt: string) => {
    const project = createProject(initialPrompt)
    setProjects(listProjects())
    return project
  }, [])

  return { projects, refresh, create }
}


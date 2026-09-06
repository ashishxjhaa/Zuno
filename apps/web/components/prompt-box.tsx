"use client"

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  DicesIcon,
  FolderKanbanIcon,
  Loader2Icon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button as MovingBorder } from "@workspace/ui/components/moving-border"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  frontend,
  listProjects,
  restoreProject,
  type ProjectListItem,
} from "@/lib/api"
import { pickLandingIdea } from "@/lib/ideas"
import { useSession } from "@/lib/session"

type PromptBoxProps = {
  variant?: "default" | "meadow"
}

const PENDING_PROMPT_KEY = "zuno:landing-prompt"

export function PromptBox({ variant = "default" }: PromptBoxProps) {
  const router = useRouter()
  const { user, isLoading } = useSession()
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInspiring, setIsInspiring] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const meadow = variant === "meadow"
  const autoStarted = useRef(false)

  const submit = async (contents?: string) => {
    const prompt = (contents ?? value).trim()
    if (!prompt) {
      toast.error("Describe what you want to build")
      return
    }

    if (!user) {
      try {
        sessionStorage.setItem(PENDING_PROMPT_KEY, prompt)
      } catch {
        // ignore
      }
      router.push("/signin")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await frontend.post("/api/v1/project", {
        initialPrompt: prompt,
      })
      sessionStorage.setItem(`zuno:prompt:${res.data.id}`, prompt)
      router.push(`/projects/${res.data.id}`)
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: unknown } } })
        .response?.data
      const err = data?.error
      if (typeof err === "string") {
        toast.error(err)
        return
      }
      toast.error("Could not start the build. Is the API running?")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isLoading || autoStarted.current) return
    try {
      const pending = sessionStorage.getItem(PENDING_PROMPT_KEY)
      if (!pending) return
      setValue(pending)
      if (!user) return
      autoStarted.current = true
      sessionStorage.removeItem(PENDING_PROMPT_KEY)
      void submit(pending)
    } catch {
      // ignore
    }
  }, [isLoading, user])

  const loadProjects = async () => {
    if (!user) return
    setHistoryLoading(true)
    try {
      const res = await listProjects()
      const sorted = [...(res.data.projects ?? [])].sort((a, b) => {
        const aTime = new Date(a.lastActiveAt || a.updatedAt).getTime()
        const bTime = new Date(b.lastActiveAt || b.updatedAt).getTime()
        return bTime - aTime
      })
      setProjects(sorted)
    } catch {
      setProjects([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const inspire = async () => {
    if (isInspiring || isSubmitting) return
    setIsInspiring(true)
    try {
      let idea = pickLandingIdea()
      try {
        const res = await frontend.post<{ idea: string }>("/api/v1/ideas/random")
        if (res.data.idea?.trim()) {
          idea = res.data.idea.trim()
        }
      } catch {
        // Local idea if the API is old or offline.
      }
      setValue(idea)
    } finally {
      setIsInspiring(false)
    }
  }

  const openProject = async (project: ProjectListItem) => {
    if (restoringId) return
    setRestoringId(project.id)
    try {
      if (project.phase === "READY" || project.snapshotAt) {
        await restoreProject(project.id)
      }
      setMenuOpen(false)
      router.push(`/projects/${project.id}`)
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: unknown } } })
        .response?.data
      const err = data?.error
      if (typeof err === "string") {
        toast.error(err)
      } else {
        toast.error("Could not open project")
      }
    } finally {
      setRestoringId(null)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  const busy = isSubmitting || isInspiring || Boolean(restoringId)

  const actionsMenu = (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        setMenuOpen(open)
        if (open && user) {
          void loadProjects()
        }
      }}
    >
      <DropdownMenuTrigger
        disabled={busy}
        aria-label="Quick actions"
        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-[#ff5800] bg-transparent px-2.5 text-[13px] font-medium text-[#ff5800] transition-colors hover:bg-[#ff5800]/10 disabled:pointer-events-none disabled:opacity-40 sm:h-9 sm:px-3"
      >
        {isInspiring ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <DicesIcon className="size-3.5" />
        )}
        <span>Surprise me</span>
        <ChevronDownIcon className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[220px] rounded-sm border border-slate-200 bg-white p-1 text-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
      >
        <DropdownMenuItem
          className="cursor-pointer gap-2 rounded-sm px-2.5 py-2"
          onClick={() => void inspire()}
        >
          <DicesIcon className="size-4 text-[#ff5800]" />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">Surprise me</span>
            <span className="text-[12px] text-slate-500">
              Fill a random website idea
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className="cursor-pointer gap-2 rounded-sm px-2.5 py-2"
            onMouseEnter={() => {
              if (user) void loadProjects()
            }}
          >
            <FolderKanbanIcon className="size-4 text-slate-600" />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">My projects</span>
              <span className="text-[12px] text-slate-500">
                Open a recent build
              </span>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            align="start"
            alignOffset={0}
            side="right"
            sideOffset={6}
            sticky
            collisionAvoidance={{ side: "none", align: "none", fallbackAxisSide: "none" }}
            className="min-w-[240px] !w-auto rounded-sm border border-slate-200 bg-white p-1 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          >
            {!user ? (
              <DropdownMenuItem
                className="cursor-pointer rounded-sm px-2.5 py-2"
                onClick={() => {
                  setMenuOpen(false)
                  router.push("/signin")
                }}
              >
                <span className="text-sm text-slate-600">
                  Sign in to see your projects
                </span>
              </DropdownMenuItem>
            ) : historyLoading ? (
              <div className="flex items-center gap-2 px-2.5 py-3 text-sm text-slate-500">
                <Loader2Icon className="size-3.5 animate-spin text-[#ff5800]" />
                Loading...
              </div>
            ) : projects.length === 0 ? (
              <div className="px-2.5 py-3 text-sm text-slate-500">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  className="cursor-pointer gap-2 rounded-sm px-2.5 py-2"
                  disabled={Boolean(restoringId)}
                  onClick={() => void openProject(project)}
                >
                  <FolderKanbanIcon className="size-4 shrink-0 text-slate-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {project.title || "Untitled project"}
                  </span>
                  {restoringId === project.id ? (
                    <Loader2Icon className="size-3.5 shrink-0 animate-spin text-[#ff5800]" />
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (meadow) {
    return (
      <form
        onSubmit={onSubmit}
        className="relative flex w-full min-w-0 cursor-text flex-col justify-between overflow-visible rounded-sm border border-white/70 bg-white/90 text-slate-700 shadow-[0_18px_50px_rgba(0,70,140,0.14)] backdrop-blur min-h-[98px] max-w-[640px] sm:min-h-[106px]"
      >
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe what you want to build..."
          disabled={busy}
          aria-label="Describe what you're building"
          rows={2}
          className="w-full resize-none bg-transparent p-3.5 text-[14.5px] outline-none placeholder:text-slate-400 sm:p-4 sm:text-[16px]"
          style={{ height: 66, overflowY: "hidden" }}
        />
        <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
          {actionsMenu}
          <button
            type="submit"
            aria-label="Submit"
            disabled={isSubmitting || !value.trim()}
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-[#ff5800] text-white hover:bg-[#e04e00] disabled:pointer-events-none disabled:opacity-40 sm:size-9"
          >
            {isSubmitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArrowUpIcon className="size-4" />
            )}
          </button>
        </div>
      </form>
    )
  }

  return (
    <MovingBorder
      as="div"
      borderRadius="0.9rem"
      duration={14000}
      containerClassName={`h-auto w-full max-w-2xl p-px ${menuOpen ? "overflow-visible" : "overflow-hidden"}`}
      className="border-0 bg-card/80 p-0"
      borderClassName="size-8 bg-[#ff5800] shadow-[0_0_8px_2px_#ff5800]"
    >
      <form onSubmit={onSubmit} className="w-full">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe the website you want to build..."
          disabled={busy}
          rows={4}
          className="min-h-28 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          {actionsMenu}
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <ArrowRightIcon />
            )}
            Build
          </Button>
        </div>
      </form>
    </MovingBorder>
  )
}

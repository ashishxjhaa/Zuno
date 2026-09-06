"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ExternalLinkIcon, LoaderIcon, UnplugIcon } from "lucide-react"
import { toast } from "sonner"
import { apiBaseUrl, frontend } from "@/lib/api"
import { cn } from "@workspace/ui/lib/utils"

type GithubStatus = {
  configured: boolean
  connected: boolean
  username: string | null
  connectedAt: string | null
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function slugifyRepoName(input: string) {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 100)
  return slug || "zuno-project"
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

export function GithubPanel({
  projectId,
  projectTitle,
  initialRepoUrl,
  initialRepoName,
  disabled,
}: {
  projectId: string
  projectTitle: string
  initialRepoUrl: string | null
  initialRepoName: string | null
  disabled?: boolean
}) {
  const [status, setStatus] = useState<GithubStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [repoName, setRepoName] = useState(
    () => initialRepoName || slugifyRepoName(projectTitle)
  )
  const [repoUrl, setRepoUrl] = useState<string | null>(initialRepoUrl)
  const [pushing, setPushing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const defaultName = useMemo(
    () => initialRepoName || slugifyRepoName(projectTitle),
    [initialRepoName, projectTitle]
  )

  useEffect(() => {
    setRepoName(defaultName)
  }, [defaultName])

  useEffect(() => {
    setRepoUrl(initialRepoUrl)
  }, [initialRepoUrl])

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await frontend.get<GithubStatus>("/api/v1/github/status")
      setStatus(res.data)
    } catch (error) {
      toastApiError(error)
      setStatus(null)
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  // Popup OAuth result (no full-page reload of the builder)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as {
        type?: string
        status?: string
        message?: string
      } | null
      if (!data || data.type !== "zuno-github-oauth") return
      setConnecting(false)
      if (data.status === "connected") {
        void loadStatus()
        return
      }
      toast.error(data.message || "GitHub connection failed")
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [loadStatus])

  // Legacy full-page return: clean query, no success toast, stay on current tab
  useEffect(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    const flag = url.searchParams.get("github")
    if (!flag) return
    const message = url.searchParams.get("message")
    url.searchParams.delete("github")
    url.searchParams.delete("message")
    window.history.replaceState({}, "", url.pathname + url.search)
    if (flag === "connected") {
      void loadStatus()
    } else if (flag === "error") {
      toast.error(message || "GitHub connection failed")
    }
  }, [loadStatus])

  const onConnect = () => {
    if (connecting || disabled) return
    setConnecting(true)
    const returnTo = "/github/oauth/done"
    const start = `${apiBaseUrl()}/api/v1/github/oauth/start?returnTo=${encodeURIComponent(returnTo)}`
    const popup = window.open(
      start,
      "zuno-github-oauth",
      "width=600,height=720,menubar=no,toolbar=no,status=no"
    )
    if (!popup) {
      setConnecting(false)
      // Popup blocked — fall back to same-tab (still no success toast)
      window.location.href = start
      return
    }
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer)
        setConnecting(false)
        void loadStatus()
      }
    }, 600)
  }

  const onDisconnect = async () => {
    if (disconnecting) return
    setDisconnecting(true)
    try {
      await frontend.post("/api/v1/github/disconnect")
      setStatus((current) =>
        current
          ? {
              ...current,
              connected: false,
              username: null,
              connectedAt: null,
            }
          : current
      )
    } catch (error) {
      toastApiError(error)
    } finally {
      setDisconnecting(false)
    }
  }

  const onPush = async () => {
    if (pushing || disabled) return
    setPushing(true)
    try {
      const res = await frontend.post<{
        url: string
        repoName: string
        fullName: string
        created: boolean
        fileCount: number
      }>(`/api/v1/project/${projectId}/github/push`, {
        repoName: repoName.trim() || defaultName,
      })
      setRepoUrl(res.data.url)
      setRepoName(res.data.repoName)
      toast.success(
        res.data.created
          ? `Created ${res.data.fullName} and pushed ${res.data.fileCount} files`
          : `Pushed ${res.data.fileCount} files to ${res.data.fullName}`
      )
    } catch (error) {
      toastApiError(error)
    } finally {
      setPushing(false)
    }
  }

  if (loadingStatus && !status) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <LoaderIcon className="size-5 animate-spin text-[#ff5800]" />
      </div>
    )
  }

  const connected = Boolean(status?.connected && status.username)
  const configured = status?.configured ?? true

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-white p-6 sm:p-10">
      <div className="relative w-full max-w-[400px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 rounded-sm opacity-90 blur-2xl"
          style={{
            background:
              "radial-gradient(60% 60% at 30% 20%, rgba(255,88,0,0.14) 0%, transparent 70%), radial-gradient(50% 50% at 80% 80%, rgba(124,92,252,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="rounded-sm border border-black/[0.04] bg-[#EDE4FF] p-2.5 sm:p-3">
          <div className="rounded-sm border border-black/[0.04] bg-white p-5 sm:p-7">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex size-10 items-center justify-center rounded-sm bg-zinc-950 text-white">
                <GithubMark className="size-5" />
              </div>
              <h2
                className="mt-5 text-[26px] leading-[1.15] tracking-[-0.03em] text-[#1f1f1f] sm:text-[30px]"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", Times, serif',
                }}
              >
                Push to GitHub
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-500">
                Export this generated project to your GitHub account.
              </p>
            </div>

            {!configured ? (
              <div className="mt-5 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                GitHub OAuth is not configured on the server. Add{" "}
                <code className="font-mono text-[12px]">GITHUB_CLIENT_ID</code>,{" "}
                <code className="font-mono text-[12px]">
                  GITHUB_CLIENT_SECRET
                </code>
                , and{" "}
                <code className="font-mono text-[12px]">
                  GITHUB_CALLBACK_URL
                </code>{" "}
                then restart the API.
              </div>
            ) : null}

            <div className="mt-5 space-y-3.5 sm:mt-6">
              {!connected ? (
                <button
                  type="button"
                  disabled={!configured || disabled || connecting}
                  onClick={onConnect}
                  className={cn(
                    "inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-zinc-950 px-4 text-[14.5px] font-semibold text-white transition-colors",
                    "hover:bg-zinc-800",
                    "disabled:cursor-not-allowed disabled:opacity-70"
                  )}
                >
                  {connecting ? (
                    <>
                      <LoaderIcon className="size-4 animate-spin" />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <GithubMark className="size-4" />
                      Connect with GitHub
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-sm border border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5">
                  <div className="min-w-0 text-left">
                    <p className="truncate text-[13px] font-medium text-zinc-900">
                      @{status?.username}
                    </p>
                    <p className="text-[12px] text-zinc-500">Connected</p>
                  </div>
                  <button
                    type="button"
                    disabled={disconnecting}
                    onClick={() => void onDisconnect()}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-[12px] font-medium text-zinc-600 transition-colors hover:bg-white hover:text-zinc-900",
                      disconnecting && "pointer-events-none opacity-50"
                    )}
                  >
                    {disconnecting ? (
                      <LoaderIcon className="size-3.5 animate-spin" />
                    ) : (
                      <UnplugIcon className="size-3.5" />
                    )}
                    Disconnect
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="github-repo-name"
                  className="block text-[13px] font-medium text-zinc-700"
                >
                  Repository name
                </label>
                <input
                  id="github-repo-name"
                  value={repoName}
                  onChange={(event) => setRepoName(event.target.value)}
                  disabled={!connected || pushing || disabled || Boolean(repoUrl)}
                  placeholder={defaultName}
                  className={cn(
                    "h-10 w-full rounded-sm border border-zinc-200 bg-[#FAFAFA] px-3.5 text-[14.5px] text-zinc-950 outline-none transition-[border-color,box-shadow,background-color]",
                    "placeholder:text-zinc-400",
                    "hover:border-zinc-300",
                    "focus:border-zinc-300 focus:bg-white focus:ring-4 focus:ring-zinc-900/5",
                    "disabled:cursor-not-allowed disabled:opacity-60"
                  )}
                />
                <p className="text-[12.5px] text-zinc-400">
                  {repoUrl
                    ? "Linked repo — pushes update the same repository."
                    : "Creates a new public repo if it does not exist yet."}
                </p>
              </div>

              <button
                type="button"
                disabled={!connected || pushing || disabled}
                onClick={() => void onPush()}
                className={cn(
                  "mt-1 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[#ff5800] px-4 text-[14.5px] font-semibold text-white transition-colors",
                  "hover:bg-[#e04e00]",
                  "disabled:cursor-not-allowed disabled:opacity-70"
                )}
              >
                {pushing ? (
                  <>
                    <LoaderIcon className="size-4 animate-spin" />
                    Pushing…
                  </>
                ) : (
                  "Push to GitHub"
                )}
              </button>

              {repoUrl ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-sm border border-zinc-200 bg-white text-[13.5px] font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  Open repository
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

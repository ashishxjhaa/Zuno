"use client"

import { useState } from "react"
import { DownloadIcon, LoaderIcon } from "lucide-react"
import { toast } from "sonner"
import { apiBaseUrl } from "@/lib/api"
import { cn } from "@workspace/ui/lib/utils"

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-._]+|[-._]+$/g, "")
      .slice(0, 60) || "zuno-project"
  )
}

export function DownloadPanel({
  projectId,
  projectTitle,
  disabled,
}: {
  projectId: string
  projectTitle: string
  disabled?: boolean
}) {
  const [downloading, setDownloading] = useState(false)
  const filename = `${slugify(projectTitle)}.zip`

  const onDownload = async () => {
    if (downloading || disabled) return
    setDownloading(true)
    try {
      const res = await fetch(
        `${apiBaseUrl()}/api/v1/project/${projectId}/download`,
        {
          method: "GET",
          credentials: "include",
        }
      )
      if (!res.ok) {
        let message = `Could not download codebase (${res.status})`
        try {
          const data = (await res.json()) as { error?: string }
          if (typeof data.error === "string" && data.error.trim()) {
            message = data.error
          }
        } catch {
          // ignore non-JSON error bodies
        }
        toast.error(message)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Could not download codebase")
    } finally {
      setDownloading(false)
    }
  }

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
              <div className="inline-flex size-10 items-center justify-center rounded-sm bg-[#ff5800]/10 text-[#ff5800]">
                <DownloadIcon className="size-5" />
              </div>
              <h2
                className="mt-5 text-[26px] leading-[1.15] tracking-[-0.03em] text-[#1f1f1f] sm:text-[30px]"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", Times, serif',
                }}
              >
                Download codebase
              </h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-500">
                (source only - no{" "}
                <code className="font-mono text-[12px]">node_modules</code>).
              </p>
            </div>

            <div className="mt-5 space-y-3.5 sm:mt-6">
              <div className="rounded-sm border border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5 text-left">
                <p className="text-[12px] font-medium text-zinc-500">File</p>
                <p className="mt-0.5 truncate font-mono text-[13px] text-zinc-900">
                  {filename}
                </p>
              </div>

              <button
                type="button"
                disabled={disabled || downloading}
                onClick={() => void onDownload()}
                className={cn(
                  "inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-[#ff5800] px-4 text-[14.5px] font-semibold text-white transition-colors",
                  "hover:bg-[#e04e00]",
                  "disabled:cursor-not-allowed disabled:opacity-70"
                )}
              >
                {downloading ? (
                  <>
                    <LoaderIcon className="size-4 animate-spin" />
                    Preparing…
                  </>
                ) : (
                  <>
                    <DownloadIcon className="size-4" />
                    Download .zip
                  </>
                )}
              </button>

              <p className="text-center text-[12.5px] text-zinc-400">
                If preview is cold, open Preview once so the sandbox can restore
                before downloading.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

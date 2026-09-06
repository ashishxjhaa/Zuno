"use client"

import { useEffect } from "react"

export default function GithubOAuthDonePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get("github") || "error"
    const message = params.get("message") || undefined
    const payload = {
      type: "zuno-github-oauth" as const,
      status,
      message,
    }

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin)
      window.close()
      return
    }

    // Fallback if opened without a popup opener
    window.location.replace("/")
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-[14px] text-zinc-500">
      Finishing GitHub connection…
    </div>
  )
}

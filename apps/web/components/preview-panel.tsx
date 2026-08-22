"use client"

import { useEffect, useRef } from "react"

export function PreviewPanel({ src }: { src: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!src) return
    const iframe = iframeRef.current
    if (!iframe) return

    // Keep scroll position and avoid full reload when the same preview URL is reused.
    const currentSrc = iframe.getAttribute("data-src")
    if (currentSrc === src) return

    iframe.src = src
    iframe.setAttribute("data-src", src)
  }, [src])

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Preview appears after the first build.
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      title="Site preview"
      className="h-full w-full border-0 bg-transparent"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="clipboard-write"
    />
  )
}

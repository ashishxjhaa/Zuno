"use client"

import { useEffect, useRef } from "react"

export function PreviewPanel({
  src,
  onReady,
}: {
  src: string | null
  onReady?: (ready: boolean) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    if (!src) {
      onReadyRef.current?.(false)
      return
    }
    onReadyRef.current?.(false)
    const iframe = iframeRef.current
    if (!iframe) return

    const currentSrc = iframe.getAttribute("data-src")
    if (currentSrc === src) return

    iframe.src = src
    iframe.setAttribute("data-src", src)
  }, [src])

  if (!src) {
    return <div className="h-full w-full bg-zinc-50" />
  }

  return (
    <iframe
      ref={iframeRef}
      title="Site preview"
      className="h-full w-full border-0 bg-transparent"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="clipboard-write"
      onLoad={() => onReadyRef.current?.(true)}
    />
  )
}

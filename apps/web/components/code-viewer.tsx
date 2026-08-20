"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function CodeViewer({ files }: { files: Record<string, string> }) {
  const paths = useMemo(() => Object.keys(files).sort(), [files])
  const [activePath, setActivePath] = useState(paths[0] ?? "")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!paths.includes(activePath)) {
      setActivePath(paths[0] ?? "")
    }
  }, [paths, activePath])

  const contents = files[activePath] ?? ""

  const copy = async () => {
    await navigator.clipboard.writeText(contents)
    setCopied(true)
    toast.success("Copied")
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex h-full min-h-0">
      <aside className="no-scrollbar w-44 shrink-0 overflow-y-auto border-r border-border p-2">
        {paths.map((path) => (
          <button
            key={path}
            type="button"
            onClick={() => setActivePath(path)}
            className={cn(
              "mb-1 w-full truncate rounded-md px-2 py-1.5 text-left text-xs",
              path === activePath
                ? "bg-primary/15 text-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {path}
          </button>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="truncate text-xs text-muted-foreground">{activePath}</p>
          <Button type="button" size="xs" variant="outline" onClick={() => void copy()}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            Copy
          </Button>
        </div>
        <textarea
          readOnly
          value={contents}
          spellCheck={false}
          className="no-scrollbar min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-foreground outline-none"
        />
      </div>
    </div>
  )
}

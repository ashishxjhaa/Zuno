"use client"

import { useState, type FormEvent } from "react"
import { ArrowUpIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export function ChatPanel() {
  const [value, setValue] = useState("")

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#161614]">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-6" />
      </div>

      <form onSubmit={submit} className="p-3">
        <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#1c1c1a] px-2.5">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask Zuno to change the site…"
            rows={1}
            className="no-scrollbar max-h-32 min-h-8 flex-1 resize-none bg-transparent py-2 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

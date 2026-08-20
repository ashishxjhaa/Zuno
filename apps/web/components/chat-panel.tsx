"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { ArrowUpIcon } from "lucide-react"
import { toast } from "sonner"
import type { ConversationItem } from "@workspace/shared"
import { cn } from "@workspace/ui/lib/utils"

export function ChatPanel({
  messages,
  isGenerating,
  onSend,
}: {
  messages: ConversationItem[]
  isGenerating: boolean
  onSend: (contents: string) => string | null
}) {
  const [value, setValue] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isGenerating])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const error = onSend(value)
    if (error) {
      toast.error(error)
      return
    }
    setValue("")
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#161614]">
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col gap-6">
          {messages.map((message) =>
            message.from === "USER" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-xl bg-[#2c2c29] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#f4f3ee]">
                  {message.contents}
                </p>
              </div>
            ) : (
              <div key={message.id} className="flex gap-2.5">
                <Image
                  src="/zuno.svg"
                  alt=""
                  width={22}
                  height={22}
                  className="mt-0.5 size-[22px] shrink-0 rounded-md"
                />
                <p className="max-w-[90%] rounded-xl bg-[#21211f] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#c4c2ba]">
                  {message.contents}
                </p>
              </div>
            )
          )}

          {isGenerating ? (
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Image
                src="/zuno.svg"
                alt=""
                width={22}
                height={22}
                className="animate-zuno-pulse size-[22px] rounded-md"
              />
              <span>Cooking…</span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={submit} className="p-3">
        <div className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#1c1c1a] px-2.5">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask Zuno to change the site…"
            rows={1}
            disabled={isGenerating}
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
            disabled={isGenerating || !value.trim()}
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

"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import { ArrowUpIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type ChatMessage = {
  id: string
  from: "USER" | "ASSISTANT"
  contents: string
}

export function ChatPanel({
  messages,
  cooking,
  onSend,
}: {
  messages: ChatMessage[]
  cooking: boolean
  onSend: (contents: string) => Promise<void>
}) {
  const [value, setValue] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, cooking])

  // Auto-grow textarea height up to a max.
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`
  }, [value])

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const contents = value.trim()
    if (!contents || cooking) {
      return
    }
    try {
      await onSend(contents)
      setValue("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch {
      // parent already toasted
    }
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

          {cooking && messages[messages.length - 1]?.from !== "ASSISTANT" ? (
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Image
                src="/zuno.svg"
                alt=""
                width={22}
                height={22}
                className="size-[22px] shrink-0 rounded-md"
              />
              <span>Cooking…</span>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={(event) => void submit(event)} className="p-3">
        <div className="flex items-end gap-2 rounded-xl border border-dashed border-[var(--show-color)] bg-[#1c1c1a] px-2.5 py-2 transition-colors duration-150 [--show-color:#ff5800]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Ask Zuno to change the site…"
            rows={1}
            className="no-scrollbar min-h-8 flex-1 resize-none bg-transparent py-2 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                if (cooking) {
                  return
                }
                submit()
              }
            }}
          />
          <button
            type="submit"
            disabled={cooking || !value.trim()}
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

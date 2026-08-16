"use client"

import { BotIcon, BotMessageSquareIcon, UserIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import PromptInput from "./prompt-input"

const ChatPanel = ({ messages, onSend, loading }) => {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" })
  }, [messages, loading])

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="hide-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-zinc-400">
              Ask AI to modify your webiste
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-50">
                {msg.role === "user" ? (
                  <UserIcon size={14} className="text-zinc-500" />
                ) : (
                  <BotMessageSquareIcon size={14} className="text-zinc-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  {msg.role === "user" ? "You" : "AI"}
                </p>
                <p className="leading- text-[13px] tracking-wider wrap-break-word whitespace-pre-wrap text-zinc-700">
                  {msg.content.split("- `/").map((text, i) => (
                    <span key={i} className="mt-3 block">
                      <span className={i === 0 ? "hidden" : ""}>- `/</span>
                      {text}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-900/5">
              <BotIcon size={13} className="text-zinc-900" />
            </div>
            <div className="flex-1">
              <p className="mb-2 text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
                AI
              </p>
              <div className="dot-loader">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-200 p-3">
        <PromptInput
          onSubmit={onSend}
          loading={loading}
          placeholder="Ask AI to modify..."
          autoFocus
        />
      </div>
    </div>
  )
}

export default ChatPanel

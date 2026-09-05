"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { ArrowUpIcon, CheckIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Message, MessageAvatar, MessageContent } from "@workspace/ui/components/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"
import { AnimatePresence, motion } from "motion/react"
import type { ProjectFramework, ProjectLanguage } from "@/lib/api"
import { ShimmeringText } from "@workspace/ui/components/shimmering-text"
import { ChatMarkdown } from "@/components/chat-markdown"
import { ZunoMascot, type ZunoMascotState } from "@/components/zuno-mascot"

export type ChatMessage = {
  id: string
  from: "USER" | "ASSISTANT"
  contents: string
}

const FRAMEWORKS: {
  id: ProjectFramework
  label: string
  detail: string
}[] = [
  {
    id: "react",
    label: "React + Vite",
    detail: "Fast SPA. Great for marketing sites and apps.",
  },
  {
    id: "nextjs",
    label: "Next.js",
    detail: "Full-stack React with routing and SSR.",
  },
]

const LANGUAGES: {
  id: ProjectLanguage
  label: string
  detail: string
}[] = [
  {
    id: "typescript",
    label: "TypeScript",
    detail: "Typed. Safer refactors as the project grows.",
  },
  {
    id: "javascript",
    label: "JavaScript",
    detail: "Simple and familiar. Fewer setup constraints.",
  },
]

const WORD_MS = 40

function OptionTile({
  label,
  detail,
  selected,
  disabled,
  onSelect,
}: {
  label: string
  detail: string
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-sm border bg-white px-3.5 py-3 text-left transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-[#ff5800] ring-1 ring-[#ff5800]"
          : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
          selected
            ? "border-[#ff5800] bg-[#ff5800] text-white"
            : "border-zinc-300 bg-white"
        )}
      >
        {selected ? <CheckIcon className="size-2.5 stroke-[3]" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-zinc-950">
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500">
          {detail}
        </span>
      </span>
    </button>
  )
}

function StackPickerCard({
  framework,
  language,
  busy,
  disabled,
  onFramework,
  onLanguage,
  onConfirm,
}: {
  framework: ProjectFramework
  language: ProjectLanguage
  busy: boolean
  disabled: boolean
  onFramework: (value: ProjectFramework) => void
  onLanguage: (value: ProjectLanguage) => void
  onConfirm: () => void
}) {
  return (
    <div className="flex gap-2.5">
      <ZunoMascot state="idle" size={22} className="mt-0.5" />
      <div className="w-full max-w-[420px] overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <p className="text-[14px] font-semibold tracking-tight text-zinc-950">
            Choose your stack
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">
            Pick a framework and language. You can change the site later in chat.
          </p>
        </div>

        <div className="space-y-4 px-4 py-3.5">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Framework
            </p>
            <div className="grid gap-2">
              {FRAMEWORKS.map((item) => (
                <OptionTile
                  key={item.id}
                  label={item.label}
                  detail={item.detail}
                  selected={framework === item.id}
                  disabled={disabled}
                  onSelect={() => onFramework(item.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Language
            </p>
            <div className="grid gap-2">
              {LANGUAGES.map((item) => (
                <OptionTile
                  key={item.id}
                  label={item.label}
                  detail={item.detail}
                  selected={language === item.id}
                  disabled={disabled}
                  onSelect={() => onLanguage(item.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className={cn(
              "w-full cursor-pointer rounded-sm bg-[#ff5800] px-3 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#e04e00]",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            {busy ? "Starting build..." : "Confirm and build"}
          </button>
        </div>
      </div>
    </div>
  )
}

const WORKING_PHRASES = [
  "Agent is thinking...",
  "Processing your request...",
  "Analyzing the data...",
  "Generating response...",
  "Almost there...",
]

function WorkingStatus() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % WORKING_PHRASES.length)
    }, 3000)
    return () => window.clearInterval(interval)
  }, [])

  const phrase = WORKING_PHRASES[currentIndex] ?? WORKING_PHRASES[0]!

  return (
    <div className="px-1 py-1 text-[13px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={phrase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <ShimmeringText
            text={phrase}
            className="text-[13px]"
            startOnView={false}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function ZunoAvatar({ state }: { state: ZunoMascotState }) {
  return (
    <MessageAvatar className="size-[22px] self-start overflow-visible bg-transparent">
      <ZunoMascot state={state} size={22} />
    </MessageAvatar>
  )
}

/** Reveal server stream buffer word-by-word for a typewriter feel. */
function useWordStream(streamingText: string | null) {
  const [displayed, setDisplayed] = useState("")
  const targetRef = useRef("")
  const displayedRef = useRef("")

  useEffect(() => {
    if (streamingText === null) {
      targetRef.current = ""
      displayedRef.current = ""
      setDisplayed("")
      return
    }
    targetRef.current = streamingText
    if (!streamingText.startsWith(displayedRef.current)) {
      displayedRef.current = ""
      setDisplayed("")
    }
  }, [streamingText])

  useEffect(() => {
    if (streamingText === null) return

    const timer = window.setInterval(() => {
      const target = targetRef.current
      const prev = displayedRef.current
      if (prev.length >= target.length) return

      const rest = target.slice(prev.length)
      const match = rest.match(/^(\s+\S+|\S+|\s+)/)
      const next = match ? prev + match[0] : target
      displayedRef.current = next
      setDisplayed(next)
    }, WORD_MS)

    return () => window.clearInterval(timer)
  }, [streamingText !== null])

  return displayed
}

export function ChatPanel({
  messages,
  cooking,
  onSend,
  planning = false,
  stackVisible = false,
  stackBusy = false,
  onConfirmStack,
  centered = false,
  streamingText = null,
}: {
  messages: ChatMessage[]
  cooking: boolean
  onSend: (contents: string) => Promise<void>
  planning?: boolean
  stackVisible?: boolean
  stackBusy?: boolean
  onConfirmStack?: (
    framework: ProjectFramework,
    language: ProjectLanguage
  ) => Promise<void>
  centered?: boolean
  streamingText?: string | null
  streamStatus?: "tools" | "reply" | null
}) {
  const [value, setValue] = useState("")
  const [framework, setFramework] = useState<ProjectFramework>("react")
  const [language, setLanguage] = useState<ProjectLanguage>("typescript")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const displayedStream = useWordStream(streamingText)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    const max = planning ? 66 : 128
    textarea.style.height = `${Math.min(textarea.scrollHeight, max)}px`
  }, [value, planning])

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const contents = value.trim()
    if (!contents || cooking) {
      return
    }
    // Clear immediately so the typed text does not linger while the stream runs.
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
    try {
      await onSend(contents)
    } catch {
      // parent already toasted; restore draft so the user can retry
      setValue(contents)
    }
  }

  const stackDisabled = stackBusy || cooking
  const isStreaming = streamingText !== null
  const showCooking =
    cooking && !isStreaming && messages[messages.length - 1]?.from !== "ASSISTANT"
  const showStack = Boolean(stackVisible && onConfirmStack && !cooking)
  const mascotState: ZunoMascotState = isStreaming
    ? "streaming"
    : cooking
      ? "thinking"
      : "idle"

  const inputForm = (
    <form onSubmit={(event) => void submit(event)}>
      {planning ? (
        <div className="relative flex w-full min-w-0 cursor-text flex-col justify-between overflow-visible rounded-sm border border-white/70 bg-white/90 text-slate-700 shadow-[0_18px_50px_rgba(0,70,140,0.14)] backdrop-blur min-h-[98px]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={
              stackVisible
                ? "Or keep clarifying in chat..."
                : "Answer clarifying questions..."
            }
            rows={2}
            disabled={cooking}
            aria-label="Message Zuno"
            className="w-full resize-none bg-transparent p-3.5 text-[14.5px] outline-none placeholder:text-slate-400"
            style={{ height: 66, overflowY: "hidden" }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                if (cooking) return
                void submit()
              }
            }}
          />
          <div className="flex items-center justify-end gap-2 px-2.5 pb-2.5">
            <button
              type="submit"
              disabled={cooking || !value.trim()}
              aria-label="Submit"
              className={cn(
                "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-[#ff5800] text-white hover:bg-[#e04e00]",
                "disabled:pointer-events-none disabled:opacity-40"
              )}
            >
              <ArrowUpIcon className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2 rounded-sm border border-zinc-200 bg-zinc-50 px-2.5 py-2 transition-colors duration-150 focus-within:border-zinc-400">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Send follow-up"
            rows={1}
            className="no-scrollbar min-h-8 flex-1 resize-none bg-transparent py-2 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                if (cooking) return
                void submit()
              }
            }}
          />
          <button
            type="submit"
            disabled={cooking || !value.trim()}
            className={cn(
              "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-[#ff5800] text-white hover:bg-[#e04e00]",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </div>
      )}
    </form>
  )

  const messageList = (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="last-anchor"
      scrollPreviousItemPeek={48}
    >
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport className={cn("px-4", planning ? "py-4" : "py-5")}>
          <MessageScrollerContent
            className={cn("gap-6", planning ? "justify-start" : "justify-end")}
          >
            {messages.map((message) =>
              message.from === "USER" ? (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor
                >
                  <Message align="end">
                    <MessageContent>
                      <Bubble align="end" variant="secondary" className="max-w-[85%]">
                        <BubbleContent className="rounded-sm bg-zinc-900 px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                          <ChatMarkdown text={message.contents} />
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ) : (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message align="start">
                    <ZunoAvatar state="idle" />
                    <MessageContent>
                      <Bubble align="start" variant="outline" className="max-w-[90%]">
                        <BubbleContent className="whitespace-pre-wrap rounded-sm border-border bg-muted px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
                          <ChatMarkdown text={message.contents} />
                        </BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              )
            )}

            {isStreaming ? (
              <MessageScrollerItem key="streaming" messageId="streaming" scrollAnchor>
                <Message align="start">
                  <ZunoAvatar state={mascotState} />
                  <MessageContent>
                    {displayedStream ? (
                      <Bubble align="start" variant="outline" className="max-w-[90%]">
                        <BubbleContent className="whitespace-pre-wrap rounded-sm border-border bg-muted px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground">
                          <ChatMarkdown text={displayedStream} />
                          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[#ff5800] align-middle" />
                        </BubbleContent>
                      </Bubble>
                    ) : (
                      <WorkingStatus />
                    )}
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}

            {showCooking ? (
              <MessageScrollerItem messageId="cooking">
                <Message align="start">
                  <ZunoAvatar state="thinking" />
                  <MessageContent>
                    <WorkingStatus />
                  </MessageContent>
                </Message>
              </MessageScrollerItem>
            ) : null}

            {showStack ? (
              <MessageScrollerItem messageId="stack-picker">
                <StackPickerCard
                  framework={framework}
                  language={language}
                  busy={stackBusy}
                  disabled={stackDisabled}
                  onFramework={setFramework}
                  onLanguage={setLanguage}
                  onConfirm={() => void onConfirmStack?.(framework, language)}
                />
              </MessageScrollerItem>
            ) : null}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton direction="end" size="sm" className="cursor-pointer rounded-sm" />
      </MessageScroller>
    </MessageScrollerProvider>
  )

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-background",
        !centered && "border-r border-border"
      )}
    >
      {messageList}
      <div
        className={cn(
          "shrink-0",
          planning ? "px-1 pb-4 pt-2 sm:px-0" : "p-3"
        )}
      >
        {inputForm}
      </div>
    </div>
  )
}

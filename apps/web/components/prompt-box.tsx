"use client"

import { useState, type FormEvent, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, ArrowUpIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Button as MovingBorder } from "@workspace/ui/components/moving-border"
import { Textarea } from "@workspace/ui/components/textarea"
import { frontend } from "@/lib/api"
import { useSession } from "@/lib/session"

type PromptBoxProps = {
  variant?: "default" | "meadow"
}

export function PromptBox({ variant = "default" }: PromptBoxProps) {
  const router = useRouter()
  const { user } = useSession()
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const meadow = variant === "meadow"

  const submit = async () => {
    if (!value.trim()) {
      toast.error("Describe what you want to build")
      return
    }

    if (!user) {
      router.push("/signin")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await frontend.post("/api/v1/project", {
        initialPrompt: value,
      })
      sessionStorage.setItem(`zuno:prompt:${res.data.id}`, value)
      router.push(`/builder/${res.data.id}`)
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: unknown } } })
        .response?.data
      const err = data?.error
      if (typeof err === "string") {
        toast.error(err)
        return
      }
      toast.error("Could not start the build. Is the API running?")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submit()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  if (meadow) {
    return (
      <form
        onSubmit={onSubmit}
        className="relative flex w-full min-w-0 cursor-text flex-col justify-between overflow-visible rounded-[8px] border border-white/70 bg-white/90 text-slate-700 shadow-[0_18px_50px_rgba(0,70,140,0.14)] backdrop-blur min-h-[98px] max-w-[640px] sm:min-h-[106px]"
      >
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe what you want to build..."
          disabled={isSubmitting}
          aria-label="Describe what you're building"
          rows={2}
          className="w-full resize-none bg-transparent p-3.5 text-[14.5px] outline-none placeholder:text-slate-400 sm:p-4 sm:text-[16px]"
          style={{ height: 66, overflowY: "hidden" }}
        />
        <div className="flex items-center justify-end gap-2 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
          <button
            type="submit"
            aria-label="Submit"
            disabled={isSubmitting}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ff5800]/45 bg-white text-[#ff5800] transition hover:bg-orange-50 active:scale-95 disabled:opacity-60 sm:h-9 sm:w-9"
          >
            {isSubmitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArrowUpIcon className="size-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </form>
    )
  }

  return (
    <MovingBorder
      as="div"
      borderRadius="0.9rem"
      duration={14000}
      containerClassName="h-auto w-full max-w-2xl overflow-hidden p-px"
      className="border-0 bg-card/80 p-0"
      borderClassName="size-8 bg-[#ff5800] shadow-[0_0_8px_2px_#ff5800]"
    >
      <form onSubmit={onSubmit} className="w-full">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe the website you want to build..."
          disabled={isSubmitting}
          rows={4}
          className="min-h-28 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="flex justify-end px-3 pb-3">
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <ArrowRightIcon />
            )}
            Build
          </Button>
        </div>
      </form>
    </MovingBorder>
  )
}

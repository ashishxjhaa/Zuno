"use client"

import { useState, type FormEvent, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { Button as MovingBorder } from "@workspace/ui/components/moving-border"
import { Textarea } from "@workspace/ui/components/textarea"
import { frontend } from "@/lib/api"
import { useSession } from "@/lib/session"

export function PromptBox() {
  const router = useRouter()
  const { user } = useSession()
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      router.push(`/builder/${res.data.id}`)
    } catch (error: any) {
      const err = error.response.data.error
      if (typeof err === "string") {
        toast.error(err)
        return
      }

      for (const messages of Object.values(err.fieldErrors)) {
        if (Array.isArray(messages) && typeof messages[0] === "string") {
          toast.error(messages[0])
          return
        }
      }
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
          placeholder="Describe the website you want to build…"
          disabled={isSubmitting}
          rows={4}
          className="min-h-28 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="flex justify-end px-3 pb-3">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
          >
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

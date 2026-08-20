"use client"

import { useState, type FormEvent, type KeyboardEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { createProjectSchema } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Button as MovingBorder } from "@workspace/ui/components/moving-border"
import { Textarea } from "@workspace/ui/components/textarea"
import { clearPendingPrompt, savePendingPrompt } from "@/lib/pending-prompt"
import { useProjects } from "@/lib/use-projects"
import { useSession } from "@/lib/session"

export function PromptBox() {
  const router = useRouter()
  const { user } = useSession()
  const { create } = useProjects()
  const [value, setValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitPrompt = async (raw: string) => {
    const parsed = createProjectSchema.safeParse({ initialPrompt: raw })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter a prompt")
      return
    }

    setIsSubmitting(true)
    savePendingPrompt(parsed.data.initialPrompt)

    if (!user) {
      setIsSubmitting(false)
      router.push("/signin?next=/")
      return
    }

    toast.success("Starting your project…")
    const project = create(parsed.data.initialPrompt)
    clearPendingPrompt()
    router.push(`/builder/${project.id}`)
    setIsSubmitting(false)
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitPrompt(value)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void submitPrompt(value)
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
            disabled={isSubmitting || !value.trim()}
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

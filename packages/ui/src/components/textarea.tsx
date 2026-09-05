import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-sm border border-input bg-input/30 px-3 py-2 text-sm transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-zinc-400 focus-visible:ring-3 focus-visible:ring-zinc-400/30",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-sm border border-input bg-input/30 px-3 py-1 text-sm transition-colors outline-none",
        "placeholder:text-muted-foreground",
        "focus-visible:border-zinc-400 focus-visible:ring-3 focus-visible:ring-zinc-400/30",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }

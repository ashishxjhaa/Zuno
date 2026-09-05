"use client"

import Image from "next/image"
import { cn } from "@workspace/ui/lib/utils"

export type ZunoMascotState = "idle" | "thinking" | "streaming"

export function ZunoMascot({
  state = "idle",
  size = 22,
  className,
}: {
  state?: ZunoMascotState
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-sm",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/zuno.svg"
        alt=""
        width={size}
        height={size}
        className="size-full rounded-sm object-contain"
        priority={false}
      />
    </span>
  )
}

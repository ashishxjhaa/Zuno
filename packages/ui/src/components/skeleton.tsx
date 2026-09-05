import { cn } from "@workspace/ui/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-sm bg-zinc-200/80",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full animate-skeleton-shimmer bg-gradient-to-r from-transparent via-white/80 to-transparent"
      />
    </div>
  )
}

export { Skeleton }

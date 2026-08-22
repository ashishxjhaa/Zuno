import { useId } from "react"

export function GeneratingOverlay() {
  const gradId = useId()

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <svg
        viewBox="0 0 512 512"
        className="animate-zuno-pulse size-24"
        aria-hidden
      >
        <rect width="512" height="512" rx="128" fill={`url(#${gradId})`} />
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="100%">
            <stop stopColor="#f5af19" />
            <stop offset="1" stopColor="#f12711" />
          </radialGradient>
        </defs>
        <g
          transform="translate(80 80) scale(22)"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="animate-zuno-draw"
            strokeWidth="1.5"
            d="M1.75 10.25v-.672a2 2 0 0 1 .586-1.414l5.828-5.828a2 2 0 0 1 1.414-.586h.672a4 4 0 0 1 4 4v.672a2 2 0 0 1-.586 1.414l-5.828 5.828a2 2 0 0 1-1.414.586H5.75a4 4 0 0 1-4-4Z"
          />
          <path
            strokeWidth="1"
            d="M9.5 7a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM7.5 9a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"
          />
        </g>
      </svg>
      <p className="mt-4 text-sm text-muted-foreground">Cooking…</p>
    </div>
  )
}

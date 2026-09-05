"use client"

/** Original mark: stroke path only. No scale / pulse. */
function ZunoMark() {
  return (
    <svg
      width={96}
      height={96}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-24"
    >
      <rect width="512" height="512" rx="128" fill="url(#zuno-overlay-g)" />
      <defs>
        <radialGradient
          id="zuno-overlay-g"
          cx="50%"
          cy="50%"
          r="100%"
          fx="50%"
          fy="50%"
        >
          <stop stopColor="#f5af19" />
          <stop offset="1" stopColor="#f12711" />
        </radialGradient>
      </defs>
      <g transform="translate(80 80) scale(22)">
        <path
          className="animate-zuno-draw"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M1.75 10.25v-.672a2 2 0 0 1 .586-1.414l5.828-5.828a2 2 0 0 1 1.414-.586h.672a4 4 0 0 1 4 4v.672a2 2 0 0 1-.586 1.414l-5.828 5.828a2 2 0 0 1-1.414.586H5.75a4 4 0 0 1-4-4Z"
        />
        <path
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.5 7a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM7.5 9a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"
        />
      </g>
    </svg>
  )
}

export function GeneratingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white">
      <ZunoMark />
    </div>
  )
}

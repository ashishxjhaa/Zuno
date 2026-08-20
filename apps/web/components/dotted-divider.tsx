export function DottedDivider() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6">
      <svg aria-hidden className="block h-[2px] w-full" preserveAspectRatio="none">
        <line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          stroke="#f5af19"
          strokeWidth="2"
          strokeDasharray="1.5 7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

import type { CSSProperties } from "react"

type SideFlower = {
  stem: string
  className: string
  style: CSSProperties
}

const SIDE_FLOWERS: SideFlower[] = [
  {
    stem: "pink_flower_1",
    className:
      "flower-sway absolute select-none hidden left-[6%] top-[82px] w-[44px] opacity-[0.38] sm:block sm:left-[8%] sm:w-[54px] xl:left-[10%]",
    style: {
      animationDelay: "0.4s",
      animationDuration: "7.5s",
    },
  },
  {
    stem: "pale_flower_1",
    className:
      "flower-sway absolute select-none hidden right-[6%] top-[140px] w-[44px] opacity-[0.38] sm:block sm:right-[8%] sm:w-[54px] xl:right-[10%]",
    style: {
      animationDelay: "1.1s",
      animationDuration: "7.9s",
    },
  },
  {
    stem: "lav_flower_2",
    className:
      "flower-sway absolute select-none hidden left-[5%] top-[58%] w-[40px] opacity-[0.34] sm:block sm:left-[7%] sm:w-[48px] xl:left-[9%]",
    style: {
      animationDelay: "0.8s",
      animationDuration: "8.1s",
    },
  },
  {
    stem: "white_flower_2",
    className:
      "flower-sway absolute select-none hidden right-[5%] top-[62%] w-[40px] opacity-[0.34] sm:block sm:right-[7%] sm:w-[48px] xl:right-[9%]",
    style: {
      animationDelay: "1.4s",
      animationDuration: "7.6s",
    },
  },
  {
    stem: "pale_flower_3",
    className:
      "flower-sway absolute select-none hidden left-[8%] bottom-[12%] w-[36px] opacity-[0.3] sm:block sm:left-[10%] sm:w-[44px]",
    style: {
      animationDelay: "0.6s",
      animationDuration: "7.8s",
    },
  },
]

function SideFlowerPicture({ stem, className, style }: SideFlower) {
  return (
    <picture>
      <source srcSet={`/flowers/${stem}.avif`} type="image/avif" />
      <source srcSet={`/flowers/${stem}.webp`} type="image/webp" />
      <img
        src={`/flowers/${stem}.png`}
        alt=""
        className={className}
        style={style}
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </picture>
  )
}

export function IdeaToLife() {
  return (
    <section className="relative w-full overflow-hidden bg-white px-5 pb-44 pt-24 text-[#111111] sm:px-10 sm:pb-48 sm:pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, rgba(255,88,0,0.08) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-full overflow-hidden"
      >
        {SIDE_FLOWERS.map((flower) => (
          <SideFlowerPicture key={flower.stem + flower.className} {...flower} />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex max-w-[860px] flex-col items-center text-center">
        <h2
          className="mt-4 text-[30px] leading-[1.15] text-[#2d2d2d] sm:text-[44px]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
          }}
        >
          You don&apos;t need a developer team
          <br />
          to bring an idea to life.
        </h2>

        <div className="mt-14 grid w-full max-w-[820px] grid-cols-3 gap-3 sm:mt-20 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-x-4">
          <div className="flex min-w-0 flex-col items-center gap-3 px-1 py-2 sm:gap-4 sm:px-0 sm:py-0">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden
              className="h-12 w-12 text-[#ff5800] sm:h-20 sm:w-20"
            >
              <rect
                x="6"
                y="10"
                width="52"
                height="44"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path d="M6 20 L58 20" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="11" cy="15" r="1.2" fill="currentColor" />
              <circle cx="15.5" cy="15" r="1.2" fill="currentColor" />
              <circle cx="20" cy="15" r="1.2" fill="currentColor" />
              <rect
                x="12"
                y="26"
                width="20"
                height="3"
                rx="1.5"
                fill="currentColor"
                opacity="0.35"
              />
              <rect
                x="12"
                y="33"
                width="14"
                height="14"
                rx="2"
                fill="currentColor"
                opacity="0.25"
              />
              <rect
                x="30"
                y="33"
                width="22"
                height="6"
                rx="1.5"
                fill="currentColor"
                opacity="0.25"
              />
              <rect
                x="30"
                y="42"
                width="22"
                height="5"
                rx="1.5"
                fill="currentColor"
                opacity="0.25"
              />
            </svg>
            <span className="text-center text-[13px] font-medium leading-[1.15] text-[#202020] sm:text-[19px]">
              Landing pages
            </span>
          </div>

          <span
            aria-hidden
            className="hidden h-20 w-px bg-[#E9EEF5] sm:block"
          />

          <div className="flex min-w-0 flex-col items-center gap-3 px-1 py-2 sm:gap-4 sm:px-0 sm:py-0">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden
              className="h-12 w-12 text-[#ff5800] sm:h-20 sm:w-20"
            >
              <rect
                x="10"
                y="8"
                width="44"
                height="48"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <path
                d="M20 22h24M20 30h18M20 38h20"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="44" cy="46" r="4" fill="currentColor" opacity="0.35" />
            </svg>
            <span className="text-center text-[13px] font-medium leading-[1.15] text-[#202020] sm:text-[19px]">
              Full-stack apps
            </span>
          </div>

          <span
            aria-hidden
            className="hidden h-20 w-px bg-[#E9EEF5] sm:block"
          />

          <div className="flex min-w-0 flex-col items-center gap-3 px-1 py-2 sm:gap-4 sm:px-0 sm:py-0">
            <svg
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden
              className="h-12 w-12 text-[#ff5800] sm:h-20 sm:w-20"
            >
              <rect
                x="4"
                y="14"
                width="56"
                height="36"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <rect
                x="10"
                y="20"
                width="20"
                height="24"
                rx="2"
                fill="currentColor"
                opacity="0.18"
              />
              <rect
                x="36"
                y="20"
                width="18"
                height="4"
                rx="2"
                fill="currentColor"
                opacity="0.5"
              />
              <rect
                x="36"
                y="28"
                width="13"
                height="3"
                rx="1.5"
                fill="currentColor"
                opacity="0.3"
              />
              <rect
                x="36"
                y="35"
                width="10"
                height="3"
                rx="1.5"
                fill="currentColor"
                opacity="0.3"
              />
              <rect
                x="36"
                y="42"
                width="14"
                height="5"
                rx="2"
                fill="currentColor"
                opacity="0.45"
              />
            </svg>
            <span className="text-center text-[13px] font-medium leading-[1.15] text-[#202020] sm:text-[19px]">
              Marketing sites
            </span>
          </div>
        </div>

        <div className="mt-12 inline-flex max-w-full items-center gap-3 rounded-full border border-[#E9EEF5] bg-white/90 px-5 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur sm:mt-20 sm:gap-4 sm:px-8 sm:py-4">
          <p className="text-center text-[14px] font-medium leading-[1.45] text-[#666666] sm:text-[17px]">
            From a single prompt using{" "}
            <span className="text-[#ff5800]">Zuno</span>
          </p>
        </div>
      </div>
    </section>
  )
}

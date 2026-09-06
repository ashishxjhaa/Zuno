"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

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

function LandingArt() {
  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5">
      <div className="flex items-center justify-between">
        <span className="h-2 w-10 rounded-full bg-[#ff5800]/35" />
        <div className="flex gap-1">
          <span className="h-1.5 w-5 rounded-full bg-[#E8EDF4]" />
          <span className="h-1.5 w-5 rounded-full bg-[#E8EDF4]" />
          <span className="h-1.5 w-6 rounded-full bg-[#ff5800]/55" />
        </div>
      </div>
      <div className="mt-1 space-y-1.5">
        <div className="h-2.5 w-[72%] rounded-full bg-[#2d2d2d]/80" />
        <div className="h-2 w-[48%] rounded-full bg-[#C5CCD8]" />
      </div>
      <div className="mt-auto grid flex-1 grid-cols-3 gap-1.5 pt-2">
        <div className="rounded-sm bg-[#FFF1E8]" />
        <div className="rounded-sm bg-[#FFE4D1]" />
        <div className="rounded-sm bg-[#ff5800]/20" />
      </div>
    </div>
  )
}

function AppArt() {
  return (
    <div className="flex h-full gap-1.5 p-2.5">
      <div className="flex w-[22%] flex-col gap-1.5 rounded-sm bg-[#F4F6FA] p-1.5">
        <span className="h-1.5 w-full rounded-full bg-[#D7DEEA]" />
        <span className="h-1.5 w-[80%] rounded-full bg-[#7C5CFC]/55" />
        <span className="h-1.5 w-[70%] rounded-full bg-[#D7DEEA]" />
        <span className="mt-auto h-1.5 w-[60%] rounded-full bg-[#D7DEEA]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="h-2 w-16 rounded-full bg-[#2d2d2d]/75" />
          <span className="h-4 w-10 rounded-sm bg-[#7C5CFC]/80" />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          <div className="rounded-sm border border-[#EEF2F7] bg-white p-1.5">
            <div className="h-1.5 w-[70%] rounded-full bg-[#C5CCD8]" />
            <div className="mt-2 h-6 rounded-sm bg-[#E8EDF4]" />
          </div>
          <div className="rounded-sm border border-[#EEF2F7] bg-white p-1.5">
            <div className="h-1.5 w-[60%] rounded-full bg-[#C5CCD8]" />
            <div className="mt-2 h-6 rounded-sm bg-[#EDE4FF]" />
          </div>
          <div className="col-span-2 rounded-sm border border-[#EEF2F7] bg-[#FAFBFC] p-1.5">
            <div className="flex gap-1">
              <span className="h-5 flex-1 rounded-sm bg-[#E8EDF4]" />
              <span className="h-5 w-8 rounded-sm bg-[#7C5CFC]/25" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarketingArt() {
  return (
    <div className="flex h-full flex-col gap-1.5 p-2.5">
      <div className="relative flex flex-1 flex-col justify-end overflow-hidden rounded-sm bg-gradient-to-br from-[#FFE8D4] via-[#FFF6EF] to-[#E8F0FF] p-2.5">
        <div
          aria-hidden
          className="absolute -right-3 -top-3 size-14 rounded-full bg-[#E67E22]/20"
        />
        <div
          aria-hidden
          className="absolute bottom-2 right-3 size-8 rounded-full bg-[#0EA5E9]/20"
        />
        <div className="relative space-y-1.5">
          <div className="h-2.5 w-[65%] rounded-full bg-[#2d2d2d]/80" />
          <div className="h-1.5 w-[80%] rounded-full bg-[#2d2d2d]/25" />
          <div className="h-1.5 w-[55%] rounded-full bg-[#2d2d2d]/20" />
          <div className="mt-2 h-5 w-16 rounded-sm bg-[#E67E22]" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <span className="h-4 rounded-sm bg-[#F4F6FA]" />
        <span className="h-4 rounded-sm bg-[#F4F6FA]" />
        <span className="h-4 rounded-sm bg-[#F4F6FA]" />
      </div>
    </div>
  )
}

type BentoCard = {
  label: string
  title: string
  blurb: string
  accent: string
  well: string
  Art: () => ReactNode
  icon: ReactNode
}

const CARDS: BentoCard[] = [
  {
    label: "Landing",
    title: "Landing pages",
    blurb: "Hero, proof, and a clear CTA — ready to ship from one prompt.",
    accent: "#ff5800",
    well: "#FFF1E8",
    Art: LandingArt,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
        <path
          d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M4 9h16M9 9v11" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Apps",
    title: "Full-stack apps",
    blurb: "Dashboards, auth flows, and live data — preview as you chat.",
    accent: "#7C5CFC",
    well: "#EDE4FF",
    Art: AppArt,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
        <rect x="3" y="5" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="16" y="8" width="5" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: "Marketing",
    title: "Marketing sites",
    blurb: "Campaign pages that convert — hierarchy and polish built in.",
    accent: "#E67E22",
    well: "#FFE8CC",
    Art: MarketingArt,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
        <path
          d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

function BentoCardItem({
  label,
  title,
  blurb,
  accent,
  well,
  Art,
  icon,
  index,
}: BentoCard & { index: number }) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-sm border border-black/[0.04] bg-white p-3 transition-colors duration-300 ease-out sm:p-3.5",
        "hover:border-black/[0.07] hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-0.5 text-[12px] font-medium"
          style={{ color: accent, backgroundColor: `${accent}18` }}
        >
          <span
            className="inline-flex size-5 items-center justify-center rounded-sm bg-white"
            style={{ color: accent }}
          >
            {icon}
          </span>
          {label}
        </div>
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold"
          style={{ color: accent, backgroundColor: `${accent}14` }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="mt-2.5 text-left text-[15px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#171717] sm:text-[16px]">
        {title}
      </h3>
      <p className="mt-1 text-left text-[12px] leading-[1.4] text-[#71717a]">
        {blurb}
      </p>

      <div
        className="mt-3 aspect-[16/9] overflow-hidden rounded-sm border border-black/[0.04]"
        style={{ backgroundColor: well }}
      >
        <Art />
      </div>
    </article>
  )
}


export function IdeaToLife() {
  return (
    <section className="relative w-full overflow-hidden bg-white px-5 pb-44 pt-24 text-[#111111] sm:px-10 sm:pb-48 sm:pt-32">
      {/* Soft 7-band ROYGBIV rainbow arc */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1000 700"
          preserveAspectRatio="none"
          fill="none"
        >
          <defs>
            <filter
              id="zuno-rainbow-soft"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          {(
            [
              { d: "M -120 720 C 140 500, 380 290, 1120 40", color: "#ff2d2d" },
              { d: "M -100 675 C 155 460, 395 255, 1100 20", color: "#ff8a00" },
              { d: "M -80 630 C 170 420, 410 220, 1080 0", color: "#ffd400" },
              { d: "M -60 585 C 185 380, 425 185, 1060 -20", color: "#3ddc84" },
              { d: "M -40 540 C 200 340, 440 150, 1040 -40", color: "#2f9bff" },
              { d: "M -20 495 C 215 300, 455 115, 1020 -60", color: "#5b4dff" },
              { d: "M 0 450 C 230 260, 470 80, 1000 -80", color: "#b44dff" },
            ] as const
          ).map((band) => (
            <path
              key={band.color}
              d={band.d}
              stroke={band.color}
              strokeWidth="36"
              strokeLinecap="round"
              opacity="0.4"
              filter="url(#zuno-rainbow-soft)"
            />
          ))}
        </svg>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-full overflow-hidden"
      >
        {SIDE_FLOWERS.map((flower) => (
          <SideFlowerPicture key={flower.stem + flower.className} {...flower} />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex max-w-[920px] flex-col items-center text-center">
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

        <div className="mt-12 w-full rounded-sm border border-black/[0.04] bg-[#F7F5F2]/80 p-3 sm:mt-16 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
            {CARDS.map((card, index) => (
              <BentoCardItem key={card.label} {...card} index={index} />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

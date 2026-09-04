"use client"

import type { CSSProperties, ReactNode } from "react"
import { DESKTOP_FLOWERS, MOBILE_FLOWERS } from "@/components/hero-flowers-data"

type Flower = {
  stem: string
  className: string
  style: CSSProperties
  loading: "eager" | "lazy"
}

function FlowerPicture({ stem, className, style, loading }: Flower) {
  return (
    <picture>
      <source srcSet={`/flowers/${stem}.avif`} type="image/avif" />
      <source srcSet={`/flowers/${stem}.webp`} type="image/webp" />
      <img
        src={`/flowers/${stem}.png`}
        alt=""
        className={className}
        style={style}
        loading={loading}
        decoding="async"
        draggable={false}
      />
    </picture>
  )
}

export function HeroSky({ children }: { children: ReactNode }) {
  return (
    <section className="hero-sky relative mx-auto flex min-h-[clamp(610px,92svh,760px)] w-full items-center justify-center overflow-hidden px-4 pb-[4.5rem] pt-28 sm:min-h-[clamp(720px,85svh,900px)] sm:px-12 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] hidden overflow-hidden sm:block"
      >
        {DESKTOP_FLOWERS.map((flower, index) => (
          <FlowerPicture key={`d-${flower.stem}-${index}`} {...flower} />
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3] overflow-hidden sm:hidden"
      >
        {MOBILE_FLOWERS.map((flower, index) => (
          <FlowerPicture key={`m-${flower.stem}-${index}`} {...flower} />
        ))}
      </div>
      <div className="relative z-10 flex w-full max-w-[826px] flex-col items-center justify-center gap-5 text-center sm:gap-6">
        {children}
      </div>
    </section>
  )
}

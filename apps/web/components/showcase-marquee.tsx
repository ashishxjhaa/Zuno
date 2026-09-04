"use client"

const ROW_ONE = [
  "/showcases/adjust-to-3-2-ratio.png",
  "/showcases/adjust-to-3-2-ratio-1.png",
  "/showcases/adjust-to-3-2-ratio-2.png",
  "/showcases/creative-studio-landing-1.png",
  "/showcases/creative-studio-landing.png",
  "/showcases/fashion-portfolio.png",
  "/showcases/frame-85.png",
] as const

const ROW_TWO = [
  "/showcases/agency-brand-posters.png",
  "/showcases/contemporary-studio-website.png",
  "/showcases/creative-portfolio-homepage.png",
  "/showcases/lifestyle-brand-website.png",
  "/showcases/luxury-editorial-page.png",
  "/showcases/swiss-landing-page.png",
] as const

const MASK =
  "linear-gradient(to right, transparent 0, black 4%, black 96%, transparent 100%)"

function MarqueeCard({ src }: { src: string }) {
  return (
    <div className="w-[80vw] max-w-[360px] overflow-hidden rounded-2xl border border-[rgba(15,17,21,0.08)] bg-white sm:w-[500px] sm:max-w-none">
      <img
        src={src}
        alt=""
        className="block h-auto w-full"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </div>
  )
}

function MarqueeRow({
  images,
  direction,
  duration,
}: {
  images: readonly string[]
  direction: "left" | "right"
  duration: string
}) {
  const doubled = [...images, ...images]
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        maskImage: MASK,
        WebkitMaskImage: MASK,
      }}
    >
      <div
        className="flex w-max items-start gap-4"
        style={{
          animation:
            direction === "left"
              ? `marquee-left ${duration} linear infinite`
              : `marquee-right ${duration} linear infinite`,
          willChange: "transform",
        }}
      >
        {doubled.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="shrink-0"
            aria-hidden={index >= images.length ? true : undefined}
          >
            <MarqueeCard src={src} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ShowcaseMarquee() {
  return (
    <section className="w-full bg-white px-5 pb-12 pt-16 text-slate-950 sm:px-10 sm:pb-16 sm:pt-24">
      <div className="mx-auto w-full max-w-[80rem] text-center">
        <h2
          className="mx-auto max-w-[18ch] text-[28px] leading-[1.15] tracking-[-0.02em] text-[#2d2d2d] sm:max-w-none sm:text-[36px]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
          }}
        >
          See what people are building
        </h2>
        <div
          aria-hidden
          className="mx-auto mt-4 h-1 w-12 rounded-full bg-[#ff5800]/80 sm:mt-5"
        />
      </div>

      <div className="mt-10 sm:mt-14">
        <div
          className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden"
          style={{ height: "clamp(440px, 122vw, 740px)" }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex w-full flex-col gap-4">
              <MarqueeRow images={ROW_ONE} direction="left" duration="50s" />
              <MarqueeRow images={ROW_TWO} direction="right" duration="80s" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

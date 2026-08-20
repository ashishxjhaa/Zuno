"use client"

import { CloudShader } from "@workspace/ui/components/cloud-shader"
import { ImagesBadge } from "@workspace/ui/components/images-badge"
import { WobbleCard } from "@workspace/ui/components/wobble-card"
import { PromptBox } from "@/components/prompt-box"
import { DottedDivider } from "@/components/dotted-divider"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

const BADGE_IMAGES = [
  "/examples/site-1.png",
  "/examples/site-2.png",
  "/examples/site-3.png",
]

const FEATURES = [
  {
    title: "Describe it",
    body: "One sentence is enough. Zuno turns it into a Vite + React + TypeScript site.",
    containerClassName: "col-span-1 lg:col-span-2 bg-[#2a1810]",
    bodyClassName: "text-neutral-200",
  },
  {
    title: "Watch it build",
    body: "Live preview in a sandbox while the site comes together.",
    containerClassName: "col-span-1 bg-[#ff5800]",
    bodyClassName: "text-white/85",
  },
  {
    title: "Chat to change it",
    body: "You can view the code. Updates happen through chat — not by editing files yourself.",
    containerClassName: "col-span-1 lg:col-span-3 bg-[#262624]",
    bodyClassName: "text-neutral-200",
  },
] as const

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <CloudShader className="h-screen min-h-dvh w-full">
        <div className="mx-auto flex h-full min-h-dvh w-full max-w-6xl flex-col items-center justify-center px-6 pt-16">
          <ImagesBadge
            text="Build a website from a prompt"
            images={BADGE_IMAGES}
          />
          <h1 className="mt-20 text-2xl font-medium tracking-tight text-white md:text-3xl">
            Prompt. Preview. Ship.
          </h1>
          <div className="mt-8 flex w-full justify-center">
            <PromptBox />
          </div>
        </div>
      </CloudShader>

      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <WobbleCard
              key={feature.title}
              containerClassName={feature.containerClassName}
              className="py-10 sm:py-12"
            >
              <h2 className="max-w-sm text-left text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {feature.title}
              </h2>
              <p
                className={`mt-4 max-w-md text-left text-sm ${feature.bodyClassName}`}
              >
                {feature.body}
              </p>
            </WobbleCard>
          ))}
        </div>
      </div>

      <DottedDivider />

      <div className="mx-auto w-full max-w-6xl px-6">
        <SiteFooter />
      </div>
    </div>
  )
}

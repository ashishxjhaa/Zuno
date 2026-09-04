"use client"

import { PromptBox } from "@/components/prompt-box"
import { HeroSky } from "@/components/hero-sky"
import { IdeaToLife } from "@/components/idea-to-life"
import { ModernFeatures } from "@/components/modern-features"
import { ShowcaseMarquee } from "@/components/showcase-marquee"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="meadow" />

      <HeroSky>
        <h1
          className="text-center text-white"
          style={{
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
            fontSize: "clamp(44px, 13vw, 70px)",
            lineHeight: 1.1,
            letterSpacing: "clamp(-2.4px, -0.34vw, -1.1px)",
            margin: 0,
          }}
        >
          <span className="block">Prompt. Preview. Ship.</span>
        </h1>
        <div className="mt-10 w-full max-w-[640px] sm:mt-14">
          <PromptBox variant="meadow" />
        </div>
      </HeroSky>

      <ShowcaseMarquee />
      <div id="how-it-works"><IdeaToLife /></div>
      <div id="modern-sites"><ModernFeatures /></div>

      <SiteFooter />
    </div>
  )
}

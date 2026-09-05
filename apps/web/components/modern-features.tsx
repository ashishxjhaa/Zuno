"use client"

import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

type FeatureCard = {
  label: string
  title: string
  steps: string[]
  bestFor: string
  accent: string
  icon: ReactNode
}

type FeatureGroup = {
  heading: string
  well: string
  accent: string
  cards: FeatureCard[]
}

const GROUPS: FeatureGroup[] = [
  {
    heading: "Start building",
    well: "#EDE4FF",
    accent: "#7C5CFC",
    cards: [
      {
        label: "Prompt",
        title: "Prompt to a live site",
        steps: [
          "Describe what you want in plain language.",
          "Clarify, pick your stack, then ship a live site.",
          "Preview instantly and keep going.",
        ],
        bestFor: "Landings, MVPs, launch drafts",
        accent: "#7C5CFC",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
            <path
              d="M13 2 4.5 13.5h6L11 22l8.5-11.5h-6L13 2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
      {
        label: "Chat",
        title: "Edit through conversation",
        steps: [
          "Ask for rewrites, layouts, or new sections.",
          "See updates land in the live preview.",
          "Stay in chat instead of tool-hopping.",
        ],
        bestFor: "Iteration, copy polish, feedback",
        accent: "#2F80ED",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
            <path
              d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-6Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Make it land",
    well: "#FFE8CC",
    accent: "#E67E22",
    cards: [
      {
        label: "Responsive",
        title: "Adapts to every format",
        steps: [
          "Start from conversion-ready structure.",
          "Keep spacing and hierarchy coherent.",
          "Ship for web and mobile together.",
        ],
        bestFor: "Product pages, marketing sites",
        accent: "#E67E22",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
            <rect x="3" y="5" width="11" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <rect x="16" y="8" width="5" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        ),
      },
      {
        label: "Convert",
        title: "Built to convert",
        steps: [
          "Clear hierarchy and next steps.",
          "Messaging that matches the offer.",
          "Layouts that guide, not distract.",
        ],
        bestFor: "Signups, demos, waitlists",
        accent: "#22A06B",
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
    ],
  },
  {
    heading: "Ship with confidence",
    well: "#D9EEFF",
    accent: "#0EA5E9",
    cards: [
      {
        label: "Brand",
        title: "Stay on-brand",
        steps: [
          "Bring in colors and assets early.",
          "Keep tone consistent as you edit.",
          "Make every draft feel like yours.",
        ],
        bestFor: "Brand sites, portfolios, startups",
        accent: "#8B5CF6",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ),
      },
      {
        label: "Ship",
        title: "Share and ship",
        steps: [
          "Send a live preview when ready.",
          "Export clean code you own.",
          "Iterate the moment feedback lands.",
        ],
        bestFor: "Handoffs, demos, shipping weeks",
        accent: "#0EA5E9",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
      },
    ],
  },
]

function ModeCard({ label, title, steps, bestFor, accent, icon }: FeatureCard) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-sm border border-black/[0.04] bg-white p-6 sm:rounded-sm sm:p-7"
      )}
    >
      <div
        className="inline-flex w-fit items-center gap-2 rounded-sm px-2.5 py-1 text-[13px] font-medium"
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

      <h3 className="mt-5 text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#171717] sm:text-[24px]">
        {title}
      </h3>

      <ol className="mt-5 space-y-3 sm:mt-6 sm:space-y-3.5">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex gap-3 text-[14px] leading-[1.45] text-[#3f3f46]"
          >
            <span
              className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-[11px] font-semibold"
              style={{ color: accent, backgroundColor: `${accent}18` }}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-auto pt-7 text-[13px] leading-[1.45] text-[#71717a]">
        <span className="font-medium text-[#52525b]">Best for</span>
        <span className="mx-1.5 text-[#d4d4d8]">·</span>
        {bestFor}
      </p>
    </article>
  )
}

export function ModernFeatures() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-28 pt-10 text-[#111111] sm:px-10 sm:pb-40 sm:pt-20">
      <div className="mx-auto max-w-[80rem]">
        <div className="mx-auto max-w-[640px] text-center">
          <h2
            className="text-[32px] leading-[1.08] text-[#2d2d2d] sm:text-[48px] sm:leading-[1.1]"
            style={{
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
            }}
          >
            Modern sites
            <span className="hidden sm:inline"> </span>
            <br className="sm:hidden" />
            by default.
          </h2>
          <p className="mx-auto mt-5 max-w-[480px] text-[15px] leading-[1.5] text-[#666666] sm:mt-6 sm:text-[17px]">
            Three clear stages. Six focused modes. From prompt to ship.
          </p>
        </div>

        <div className="mt-14 space-y-10 sm:mt-16 sm:space-y-14">
          {GROUPS.map((group, groupIndex) => (
            <div key={group.heading} className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3 px-1">
                <span
                  className="inline-flex size-8 items-center justify-center rounded-sm text-[13px] font-semibold text-white sm:size-9 sm:text-[14px]"
                  style={{ backgroundColor: group.accent }}
                >
                  {String(groupIndex + 1).padStart(2, "0")}
                </span>
                <h3
                  className="text-[26px] leading-[1.15] tracking-[-0.03em] text-[#1f1f1f] sm:text-[32px]"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", Times, serif',
                  }}
                >
                  {group.heading}
                </h3>
              </div>
              <div
                className="rounded-sm border border-black/[0.04] p-5 sm:rounded-sm sm:p-6 lg:p-7"
                style={{ backgroundColor: group.well }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                  {group.cards.map((card) => (
                    <ModeCard key={card.label} {...card} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

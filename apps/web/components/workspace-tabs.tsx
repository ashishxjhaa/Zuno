"use client"

import type { ComponentType } from "react"
import { LayoutGroup, motion } from "motion/react"
import { CodeXmlIcon, DownloadIcon, EyeIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export const WORKSPACE_TABS = ["Preview", "Code", "GitHub", "Download"] as const
export type WorkspaceTab = (typeof WORKSPACE_TABS)[number]

type TabIcon = ComponentType<{ className?: string }>

const TAB_META: Record<
  WorkspaceTab,
  { icon: TabIcon; placeholder?: { title: string; body: string } }
> = {
  Preview: { icon: EyeIcon },
  Code: { icon: CodeXmlIcon },
  GitHub: { icon: GithubIcon },
  Download: {
    icon: DownloadIcon,
    placeholder: {
      title: "Download codebase",
      body: "Save the full generated project as a zip file. Coming soon.",
    },
  },
}

const TAB_TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] } as const

export function WorkspaceTabs({
  value,
  onChange,
  disabled,
}: {
  value: WorkspaceTab
  onChange: (tab: WorkspaceTab) => void
  disabled?: boolean
}) {
  return (
    <LayoutGroup>
      <div
        role="tablist"
        aria-label="Workspace view"
        className={cn(
          "inline-flex items-center gap-0.5 rounded-sm border border-zinc-200/90 bg-zinc-100 p-0.5",
          disabled && "pointer-events-none opacity-40"
        )}
      >
        {WORKSPACE_TABS.map((tab) => {
          const Icon = TAB_META[tab].icon
          const active = value === tab
          return (
            <motion.button
              key={tab}
              type="button"
              role="tab"
              aria-label={tab}
              aria-selected={active}
              disabled={disabled}
              onClick={() => onChange(tab)}
              layout
              transition={TAB_TRANSITION}
              className={cn(
                "relative flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-sm px-2 text-[13px] font-medium outline-none transition-colors duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:ring-2 focus-visible:ring-[#ff5800]/40",
                active ? "bg-[#ff5800] text-white" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  width: active ? "auto" : 0,
                  opacity: active ? 1 : 0,
                  marginLeft: active ? 6 : 0,
                }}
                transition={TAB_TRANSITION}
                className="overflow-hidden whitespace-nowrap"
              >
                {tab}
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

export function WorkspacePlaceholder({ tab }: { tab: "Download" }) {
  const meta = TAB_META[tab]
  const Icon = meta.icon
  const copy = meta.placeholder
  if (!copy) return null

  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50">
      <div className="flex max-w-sm flex-col items-center px-6 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[#ff5800]/10 text-[#ff5800]">
          <Icon className="size-5" />
        </div>
        <p className="text-[15px] font-semibold text-zinc-900">{copy.title}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
          {copy.body}
        </p>
      </div>
    </div>
  )
}

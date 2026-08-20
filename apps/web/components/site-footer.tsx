"use client"

import Link from "next/link"
import { MagneticButton } from "@workspace/ui/components/magnetic-button"

const FOOTER_LINKS = [
  {
    href: "https://x.com/ashishxjha",
    label: "Twitter",
    className:
      "inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900",
  },
  {
    href: "https://github.com/ashishxjhaa/Zuno",
    label: "Star on GitHub",
    className:
      "inline-flex rounded-md bg-[#ff5800] px-4 py-2 text-sm font-medium text-white",
  },
] as const

export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="py-8">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {year} Zuno — All rights reserved.
        </p>
        <div className="flex items-center gap-10">
          {FOOTER_LINKS.map((link) => (
            <MagneticButton key={link.href}>
              <Link
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={link.className}
              >
                {link.label}
              </Link>
            </MagneticButton>
          ))}
        </div>
      </div>
    </footer>
  )
}

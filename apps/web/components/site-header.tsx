"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { LogOutIcon } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { useSession } from "@/lib/session"

type SiteHeaderProps = {
  wide?: boolean
  variant?: "default" | "meadow"
}

type PillTone = "glass" | "solid"

function PillNav({
  tone,
  user,
  onSignout,
}: {
  tone: PillTone
  user: { name: string } | null
  onSignout: () => void
}) {
  const solid = tone === "solid"
  const navBtn =
    "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors"

  const authLinks = user ? (
    <>
      <span
        className={cn(
          navBtn,
          solid ? "bg-zinc-100 text-zinc-900" : "bg-white text-[#ff5800]"
        )}
      >
        {user.name}
      </span>
      <button
        type="button"
        onClick={onSignout}
        className={cn(
          navBtn,
          "cursor-pointer gap-1.5",
          solid
            ? "bg-zinc-900 text-white hover:bg-zinc-800"
            : "bg-white/90 text-[#e04e00] hover:bg-white"
        )}
      >
        <LogOutIcon className="size-3.5" />
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link
        href="/signin"
        className={cn(
          navBtn,
          "hidden sm:inline-flex",
          solid
            ? "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            : "text-white/95 hover:text-white"
        )}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={cn(
          navBtn,
          "shadow-sm",
          solid
            ? "bg-[#ff5800] text-white hover:bg-[#e04e00]"
            : "bg-white text-[#ff5800] hover:bg-orange-50"
        )}
      >
        Get started
      </Link>
    </>
  )

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex flex-col items-center px-3 pt-3 sm:px-10 sm:pt-7">
      <nav
        className={cn(
          "flex w-full max-w-[826px] items-center justify-between gap-3 rounded-full px-4 py-3 backdrop-blur-lg transition-[background-color,border-color,box-shadow,color] duration-200 sm:gap-4 sm:px-5 sm:py-3.5",
          solid
            ? "border border-zinc-200/80 bg-white/95 text-zinc-950 shadow-[0_8px_30px_rgba(15,17,21,0.08)]"
            : "border border-white/20 bg-white/35 text-white shadow-[0_10px_40px_rgba(0,80,150,0.15)]"
        )}
      >
        <Link
          href="/"
          className="ml-1 flex items-center gap-2 text-[20px] leading-none tracking-[-0.02em] sm:ml-2 sm:text-[22px]"
        >
          <Image src="/zuno.svg" alt="Zuno" width={28} height={28} priority />
          <span
            className={cn(
              "font-semibold tracking-tight",
              solid ? "text-zinc-950" : "text-white"
            )}
          >
            Zuno
          </span>
        </Link>
        <div className="flex items-center gap-2">{authLinks}</div>
      </nav>
    </header>
  )
}

export function SiteHeader({
  wide = false,
  variant = "default",
}: SiteHeaderProps) {
  const { user, signout } = useSession()
  const meadow = variant === "meadow"
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!meadow) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [meadow])

  // Marketing + auth share the same pill nav. Meadow only goes glass over the hero.
  if (!wide) {
    const tone: PillTone = meadow && !scrolled ? "glass" : "solid"
    return (
      <PillNav
        tone={tone}
        user={user}
        onSignout={() => void signout()}
      />
    )
  }

  const navBtn =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"

  const authLinks = user ? (
    <>
      <span className={cn(navBtn, "bg-zinc-100 text-zinc-900")}>{user.name}</span>
      <button
        type="button"
        onClick={() => void signout()}
        className={cn(navBtn, "cursor-pointer gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800")}
      >
        <LogOutIcon className="size-3.5" />
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link
        href="/signin"
        className={cn(navBtn, "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950")}
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className={cn(navBtn, "bg-[#ff5800] text-white hover:bg-[#e04e00]")}
      >
        Get started
      </Link>
    </>
  )

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-zinc-200/80 bg-white/80 text-zinc-950 backdrop-blur-md">
      <div className="mx-auto flex w-full items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/zuno.svg" alt="Zuno" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">Zuno</span>
        </Link>
        <nav className="flex items-center gap-2">{authLinks}</nav>
      </div>
    </header>
  )
}

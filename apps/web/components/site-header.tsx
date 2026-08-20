"use client"

import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useSession } from "@/lib/session"

export function SiteHeader() {
  const { user } = useSession()

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-black/40 text-white backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/zuno.svg" alt="Zuno" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">Zuno</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <span className="px-2 text-sm text-muted-foreground">
                {user.username}
              </span>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

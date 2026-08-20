"use client"

import Image from "next/image"
import Link from "next/link"
import { LogOutIcon } from "lucide-react"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useSession } from "@/lib/session"

export function SiteHeader({ wide = false }: { wide?: boolean }) {
  const { user, signout } = useSession()

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-black/40 text-white backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between px-6 py-3",
          !wide && "max-w-6xl"
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <Image src="/zuno.svg" alt="Zuno" width={28} height={28} priority />
          <span className="text-lg font-semibold tracking-tight">Zuno</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <span className="rounded-md border border-dashed border-[#ff5800] px-2.5 py-1 text-sm text-foreground">
                {user.name}
              </span>
              <button
                type="button"
                onClick={signout}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "gap-1.5 border-transparent bg-[#ef4444] text-white hover:bg-[#dc2626]"
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

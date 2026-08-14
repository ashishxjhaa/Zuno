"use client"

import { useAppContext } from "@/app/providers"
import { redirect } from "next/navigation"
import Loading from "@/components/loading"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loadingUser } = useAppContext()

  if (loadingUser) return <Loading />
  if (!user) redirect("/login")

  return <>{children}</>
}

export function GuestLayout({ children }: { children: React.ReactNode }) {
  const { user, loadingUser } = useAppContext()

  if (loadingUser) return <Loading />
  if (user) redirect("/")

  return <>{children}</>
}

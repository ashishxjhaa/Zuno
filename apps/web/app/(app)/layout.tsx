"use client"

import { RequireAuth } from "@/components/require-auth"

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <RequireAuth>{children}</RequireAuth>
}

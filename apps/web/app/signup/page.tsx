import { Suspense } from "react"
import type { Metadata } from "next"
import { AuthForm } from "@/components/auth-form"
import { SiteHeader } from "@/components/site-header"

export const metadata: Metadata = {
  title: "Sign up",
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 pt-16">
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </main>
    </div>
  )
}

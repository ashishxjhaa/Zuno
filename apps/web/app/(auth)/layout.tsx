import { SiteHeader } from "@/components/site-header"

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 pt-16">
        {children}
      </main>
    </div>
  )
}

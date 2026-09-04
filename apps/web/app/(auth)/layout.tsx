export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative h-dvh overflow-hidden bg-[#FAFAFA]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 0%, rgba(255,88,0,0.08) 0%, transparent 70%), radial-gradient(40% 35% at 85% 70%, rgba(124,92,252,0.08) 0%, transparent 70%)",
        }}
      />
      <main className="relative flex h-full w-full items-center justify-center overflow-hidden px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  )
}

import { Schibsted_Grotesk } from "next/font/google"
import type { Metadata } from "next"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { Toaster } from "@workspace/ui/components/sonner"
import { SessionProvider } from "@/lib/session"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: "/zuno.svg", type: "image/svg+xml" },
      { url: "/zuno.png" },
    ],
    apple: "/zuno.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", schibstedGrotesk.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body>
        <SessionProvider>
          <Toaster position="bottom-right" richColors />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}

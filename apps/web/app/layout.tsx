import { Schibsted_Grotesk } from "next/font/google"
import type { Metadata } from "next"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { Toaster } from "@workspace/ui/components/sonner"
import { AppContextProvider } from "./providers"

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    default: "Zuno",
    template: "%s · Zuno",
  },
  description:
    "Zuno is an AI website builder. Describe an idea and get a live Vite + React + TypeScript site you can iterate on through chat.",
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
      className={cn("dark antialiased", schibstedGrotesk.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body>
        <AppContextProvider>
          <Toaster position="bottom-right" richColors />
          {children}
        </AppContextProvider>
      </body>
    </html>
  )
}

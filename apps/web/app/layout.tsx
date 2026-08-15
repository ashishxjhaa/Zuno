import { Geist, Geist_Mono } from "next/font/google"
import type { Metadata } from "next"
import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"
import { AppContextProvider } from "./providers"
import { Toaster } from "@workspace/ui/components/sonner"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Zuno - A launch platform for your products | BackIt",
  description:
    "BackIt is a product launch platform where developers and founders list projects, get discovered, and receive community engagement through upvotes, hearts, and saves.",
  // icons: {
  //   icon: "/BackIt.svg",
  // },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable
      )}
    >
      <body>
        <AppContextProvider>
          <Toaster position="top-right" richColors />
          {children}
        </AppContextProvider>
      </body>
    </html>
  )
}

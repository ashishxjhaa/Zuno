import "./globals.css"

export const metadata = {
  title: "Site",
  description: "Built with Zuno",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}

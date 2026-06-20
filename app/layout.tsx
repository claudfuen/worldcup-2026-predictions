import { Space_Grotesk, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import "flag-icons/css/flag-icons.min.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Nav } from "@/components/nav"
import { cn } from "@/lib/utils";
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "World Cup 2026 Oracle",
  description: "Monte Carlo predictions for the 2026 FIFA World Cup — group winners, advancement, and knockout paths.",
}

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark scheme-only-dark antialiased", fontMono.variable, display.variable, "font-sans", inter.variable)}
    >
      <body className="bg-background text-foreground min-h-svh">
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
          <Nav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

import { Space_Grotesk, Geist_Mono, Inter } from "next/font/google"

import "../globals.css"
import "flag-icons/css/flag-icons.min.css"
import { Analytics } from "@vercel/analytics/next"
import { GoogleAnalytics } from "@next/third-parties/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Nav } from "@/components/nav"
import { ScoreTicker } from "@/components/score-ticker"
import { AnalyticsListener } from "@/components/analytics-listener"
import { InstallPrompt } from "@/components/install-prompt"
import { ServiceWorkerRegister } from "@/components/sw-register"
import { getPredictions } from "@/lib/getPredictions"
import { getLiveMatches, overlayLive, selectTickerItems, liveActivity } from "@/lib/live"
import { cn } from "@/lib/utils";
import { localeConfig } from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/server"
import { I18nProvider } from "@/lib/i18n/provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import type { MatchInfo } from "@/lib/predictions"
import type { Metadata, Viewport } from "next"

const SITE_NAME = "World Cup Predictor"
const SITE_URL = "https://worldcup2026predictions.app"
// Brand is "World Cup Predictor"; "2026 World Cup" stays in the title/keywords/description as SEO terms.
const TITLE = "World Cup Predictor — 2026 World Cup Odds, Bracket & Champion %"
const DESCRIPTION =
  "Monte Carlo predictions for the 2026 FIFA World Cup — group-winner odds, advancement, knockout-round and champion probabilities, updated live from real results."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: { default: TITLE, template: `%s · ${SITE_NAME}` },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "World Cup 2026 predictions",
    "World Cup 2026 odds",
    "who will win the World Cup 2026",
    "World Cup 2026 bracket",
    "World Cup 2026 simulator",
    "World Cup 2026 group predictions",
    "World Cup 2026 champion odds",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: TITLE,
    description:
      "Monte Carlo odds for every team: win your group, advance, reach each knockout round, and lift the trophy — updated live from real results.",
  },
  twitter: {
    card: "summary_large_image",
    title: "World Cup Predictor — 2026 Odds, Bracket & Champion %",
    description:
      "Monte Carlo odds for every team to advance, reach each round, and win the 2026 World Cup. Updated live.",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f1512",
  colorScheme: "dark",
}

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
}

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ lang: string }>
}>) {
  const { lang } = await params
  // The proxy guarantees lang is a valid locale here; localeConfig falls back to the default otherwise.
  const cfg = localeConfig(lang)
  const messages = await getMessages()
  let updatedAt: string | null = null
  let tickerItems: MatchInfo[] = []
  let tickerHasLive = false
  try {
    const data = await getPredictions()
    updatedAt = data.updatedAt
    let matches = data.matches
    try {
      const live = await getLiveMatches()
      matches = overlayLive(data.matches, live)
      tickerHasLive = liveActivity(data.matches, live)
    } catch {
      // live feed unavailable — fall back to the cached payload's results
    }
    // SSR first paint; the client ScoreTicker then polls /api/ticker (same selector) to keep it live.
    tickerItems = selectTickerItems(matches)
  } catch {
    updatedAt = null
  }
  return (
    <html
      lang={cfg.hreflang}
      dir={cfg.dir}
      suppressHydrationWarning
      className={cn("dark scheme-only-dark antialiased", fontMono.variable, display.variable, "font-sans", inter.variable)}
    >
      <body className="bg-background text-foreground min-h-svh">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <ThemeProvider defaultTheme="dark" enableSystem={false}>
          <I18nProvider messages={messages} intl={cfg.intl}>
            <AnalyticsListener />
            <Nav updatedAt={updatedAt} />
            <ScoreTicker initialItems={tickerItems} hasLive={tickerHasLive} />
            {children}
            {/* Site-wide footer: language selector (every page, all breakpoints) + source link */}
            <div className="border-border/60 mt-4 border-t">
              <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <LanguageSwitcher variant="footer" />
                <a
                  href="https://github.com/claudfuen/worldcup-2026-sim"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-2 text-sm transition-colors"
                >
                  <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden>
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
            <InstallPrompt />
          </I18nProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  )
}

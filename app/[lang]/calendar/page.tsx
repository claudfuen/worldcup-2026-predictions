import { getPredictions } from "@/lib/getPredictions"
import { getLiveMatches, overlayLive, liveActivity } from "@/lib/live"
import {
  finalizeGroups,
  finalizeBracket,
  ratingsFromTeams,
} from "@/lib/liveProjection"
import { Calendar } from "@/components/calendar"
import { LiveAutoRefresh } from "@/components/live-auto-refresh"
import { RelatedLinks } from "@/components/related-links"
import { localizeMatches } from "@/lib/i18n/localize-payload"
import { getT, getLocale } from "@/lib/i18n/server"
import { buildAlternates } from "@/lib/i18n/links"
import { localeHref } from "@/lib/i18n/config"
import type { Metadata } from "next"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  const locale = await getLocale()
  const title = t("calendar.metaTitle")
  const description = t("calendar.metaDesc")
  return {
    title: { absolute: title },
    description,
    alternates: buildAlternates("/calendar", locale),
    openGraph: {
      title,
      description,
      url: localeHref(locale, "/calendar"),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function CalendarPage() {
  const t = await getT()
  const locale = await getLocale()
  const [data, live] = await Promise.all([getPredictions(), getLiveMatches()])
  const hasLive = liveActivity(data.matches, live)
  // Resolve knockout participants + live scores so each day's cards reflect the current state.
  const overlaid = overlayLive(data.matches, live)
  const ratings = ratingsFromTeams(data.teams)
  const matches = hasLive
    ? finalizeBracket(
        overlaid,
        finalizeGroups(data.groups, overlaid, ratings),
        ratings
      )
    : overlaid
  const lMatches = localizeMatches(matches, t)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <LiveAutoRefresh enabled={hasLive} />
      <header className="mb-6 max-w-3xl">
        <div className="font-mono text-xs font-semibold tracking-wide text-primary uppercase">
          {t("calendar.eyebrow")}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("calendar.heading")}
        </h1>
        <p className="mt-2 text-base text-pretty text-muted-foreground">
          {t("calendar.lede")}
        </p>
      </header>

      <Calendar matches={lMatches} />

      <RelatedLinks
        links={[
          {
            label: t("groups.linkFullSchedule"),
            href: localeHref(locale, "/schedule"),
          },
          {
            label: t("bracket.relGroups"),
            href: localeHref(locale, "/groups"),
          },
          { label: t("nav.bracket"), href: localeHref(locale, "/bracket") },
          { label: t("nav.overview"), href: localeHref(locale, "/") },
        ]}
      />
    </main>
  )
}

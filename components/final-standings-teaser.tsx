import Link from "next/link"
import { getT, getLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"

// A compact launch card into the full 48-team final ranking (on /title-race). Shown on the homepage at the
// endgame, where the bracket teaser has moved up to the hero slot and this fills the races row beside the
// Golden Boot — pointing to "where every team finished" rather than repeating the live title race.
export async function FinalStandingsTeaser({
  className = "",
}: {
  className?: string
}) {
  const t = await getT()
  const locale = await getLocale()
  return (
    <Link
      href={localeHref(locale, "/title-race")}
      className={`group flex h-full flex-col justify-between rounded-2xl border border-border bg-card card-surface p-4 transition-colors hover:border-primary/50 hover:bg-surface-raised dark:inset-ring dark:inset-ring-white/8 hover:dark:inset-ring-primary/30 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="eyebrow text-muted-foreground">
          {t("home.standingsTeaserTitle")}
        </h2>
        <span
          className="text-muted-2 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        >
          →
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold tracking-tight text-balance text-foreground">
        {t("home.standingsTeaserBody")}
      </p>
      <span className="mt-3 text-sm font-medium text-primary group-hover:underline">
        {t("home.standingsTeaserCta")}
      </span>
    </Link>
  )
}

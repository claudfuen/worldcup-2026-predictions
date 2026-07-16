import Link from "next/link"
import { Flag } from "@/components/flag"
import { Delta } from "@/components/delta"
import { ProbBar } from "@/components/ui/prob-bar"
import { forecastPct, TITLE_BAR_MAX } from "@/lib/format"
import { slugForCode } from "@/lib/slug"
import { getT, getLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"
import type { TeamPrediction } from "@/lib/predictions"

// The title race in depth — a clean hairline-divided leaderboard with a magnitude bar and today's delta. On
// the overview the masthead is now this leaderboard; this card carries the race on the group/match/team pages.
// Bars use the shared ABSOLUTE domain (TITLE_BAR_MAX), never normalized to the leader — so #1 is never a full
// bar (which would read as certainty) and a title % is the same length here as in the masthead.
export async function TitleOdds({
  teams,
  className = "",
}: {
  teams: TeamPrediction[]
  className?: string
}) {
  const t = await getT()
  const locale = await getLocale()
  // Only teams still mathematically alive (champion prob > 0); a knocked-out side would otherwise pad the
  // list at a bare 0%. Fall back to the raw top-6 pre-tournament when nobody has any title mass yet.
  const alive = teams.filter((tm) => tm.title > 0)
  const contenders = (alive.length ? alive : teams).slice(0, 6)
  return (
    <section
      className={`flex flex-col rounded-2xl border border-border bg-card card-surface p-4 dark:inset-ring dark:inset-ring-white/8 ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="eyebrow text-muted-foreground">{t("home.titleRace")}</h2>
        <Link
          href={localeHref(locale, "/title-race")}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          {t("home.fullTitleRace")}
        </Link>
      </div>
      <div className="-mx-1.5 flex-1 divide-y divide-border/50">
        {contenders.map((tm, i) => (
          <Link
            key={tm.code}
            href={localeHref(locale, `/team/${slugForCode(tm.code)}`)}
            className="group flex min-h-11 items-center gap-2.5 rounded-md px-1.5 py-2 hover:bg-muted/20"
          >
            <span className="w-3 text-right font-mono text-[11px] text-muted-2 tabular-nums">
              {i + 1}
            </span>
            <Flag code={tm.code} size={18} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary">
              {tm.name}
            </span>
            <ProbBar
              value={tm.title}
              max={TITLE_BAR_MAX}
              hue="primary"
              dim={i > 0}
              size="sm"
              className="w-10 shrink-0 sm:w-14"
            />
            <span className="flex shrink-0 items-center justify-end font-mono text-sm font-semibold tabular-nums">
              <span className="w-9 text-right">{forecastPct(tm.title)}</span>
              <span className="w-7 text-left">
                <Delta v={tm.titleDelta} />
              </span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 border-t border-border/50 pt-2.5 text-[11px] text-muted-2">
        <span className="text-win">▲</span>
        <span className="text-loss">▼</span> {t("home.changeSinceStart")}
      </p>
    </section>
  )
}

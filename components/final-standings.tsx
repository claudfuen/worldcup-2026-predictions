import Link from "next/link"
import { Flag } from "@/components/flag"
import { slugForCode } from "@/lib/slug"
import { getT, getLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"
import {
  computeFinalRanking,
  type FinishTier,
  type RankedTeam,
} from "@/lib/finalRanking"
import type { MatchInfo } from "@/lib/predictions"

// "Where every team finished" — the official FIFA final ranking (1 → last) for the whole 48-team field,
// computed from REAL results only. Grouped by the stage each team reached; the still-to-be-played final and
// third-place play-off keep their teams as a shared, unsettled range until those games decide 1st–4th.

const TIER_SEQUENCE: FinishTier[] = [
  "ALIVE",
  "FINAL",
  "THIRD",
  "QF",
  "R16",
  "R32",
  "GROUP",
]

export async function FinalStandings({
  matches,
  className = "",
}: {
  matches: MatchInfo[]
  className?: string
}) {
  const t = await getT()
  const locale = await getLocale()
  const ranked = computeFinalRanking(matches)
  if (!ranked.length) return null

  const tierLabel: Record<FinishTier, string> = {
    ALIVE: t("rounds.QF"),
    FINAL: t("titleRace.tierFinal"),
    THIRD: t("titleRace.tierThird"),
    QF: t("rounds.QF"),
    R16: t("rounds.R16"),
    R32: t("rounds.R32"),
    GROUP: t("rounds.GROUP"),
  }
  const outcomeLabel: Record<NonNullable<RankedTeam["outcome"]>, string> = {
    champion: t("titleRace.champions"),
    runnerUp: t("titleRace.runnersUp"),
    third: t("titleRace.thirdPlace"),
    fourth: t("titleRace.fourthPlace"),
  }
  const pending = ranked.some(
    (r) => !r.settled && (r.tier === "FINAL" || r.tier === "THIRD")
  )

  const byTier = TIER_SEQUENCE.map((tier) => ({
    tier,
    rows: ranked.filter((r) => r.tier === tier),
  })).filter((g) => g.rows.length)

  return (
    <section className={className}>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {t("titleRace.standingsHeading")}
      </h2>
      <p className="mt-1.5 text-xs text-pretty text-muted-2">
        {t("titleRace.standingsIntro")}
      </p>
      {pending && (
        <p className="mt-1 text-xs text-pretty text-muted-2">
          {t("titleRace.standingsPending")}
        </p>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card dark:inset-ring dark:inset-ring-white/5">
        {byTier.map(({ tier, rows }) => (
          <div key={tier} className="border-border/50 not-first:border-t">
            <div className="flex items-center justify-between bg-muted/25 px-3 py-1.5 sm:px-4">
              <span className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {tierLabel[tier]}
              </span>
              <span className="font-mono text-[10px] text-muted-2 tabular-nums">
                {t("titleRace.colPts")}
                {/* GD column is hidden on the narrowest screens — keep the header label in sync */}
                <span className="hidden sm:inline">
                  {" "}
                  · {t("titleRace.colGd")}
                </span>
              </span>
            </div>
            <ol className="divide-y divide-border/40">
              {rows.map((r) => (
                <li key={r.code}>
                  <Link
                    href={localeHref(locale, `/team/${slugForCode(r.code)}`)}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/20 sm:px-4"
                  >
                    <span
                      className={`w-8 shrink-0 text-right font-mono text-xs tabular-nums ${r.settled ? "text-foreground" : "text-muted-2"}`}
                    >
                      {r.settled ? r.rank : `${r.rankLo}–${r.rankHi}`}
                    </span>
                    <Flag code={r.code} size={20} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {r.name}
                    </span>
                    {/* settled top-4 medals / unsettled status get a word instead of a bare place */}
                    {r.outcome ? (
                      <span
                        className={`shrink-0 font-mono text-[10px] font-semibold tracking-wide uppercase ${r.outcome === "champion" ? "text-contention" : "text-muted-foreground"}`}
                      >
                        {outcomeLabel[r.outcome]}
                      </span>
                    ) : !r.settled ? (
                      <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wide text-primary uppercase">
                        {r.tier === "FINAL"
                          ? t("titleRace.inFinal")
                          : t("titleRace.inThirdPlace")}
                      </span>
                    ) : null}
                    <span className="w-8 shrink-0 text-right font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                      {r.points}
                    </span>
                    <span className="hidden w-10 shrink-0 text-right font-mono text-xs text-muted-2 tabular-nums sm:inline">
                      {r.gd > 0 ? "+" : ""}
                      {r.gd}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  )
}

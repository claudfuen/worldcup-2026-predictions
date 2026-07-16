import Link from "next/link"
import type { MatchInfo, TeamPrediction } from "@/lib/predictions"
import { Flag } from "@/components/flag"
import { LocalTime } from "@/components/local-time"
import { forecastPct, ordinal } from "@/lib/format"
import { fifaCity } from "@/lib/venues"
import { decidedOnPens, pensScore } from "@/lib/penalties"
import { teamPathToFinal, type PathStep, type PathRound } from "@/lib/teamPath"
import { getT, getLocale, getIntlLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"
import type { TFunction } from "@/lib/i18n/server"

// "Who would my team have to beat to reach the final?" — the team's single most-likely road through the
// knockout bracket. Each row keeps two DIFFERENT certainties visually separate so neither is mistaken for
// the other: the team's own progress is a labelled chip on the right ("✓ reached" / "62% to reach" / "out"),
// while the OPPONENT side shows a lock icon when the tie is mathematically set (never a bare check). Played
// rounds show the real result; an eliminated team's road stops at its exit, marked in loss tone.

const SHORT: Record<PathRound, string> = {
  R32: "rounds.shortR32",
  R16: "rounds.shortR16",
  QF: "rounds.shortQF",
  SF: "rounds.shortSF",
  FINAL: "rounds.shortFinal",
}
const FULL: Record<PathRound, string> = {
  R32: "rounds.R32",
  R16: "rounds.R16",
  QF: "rounds.QF",
  SF: "rounds.SF",
  FINAL: "rounds.FINAL",
}

export async function PathToFinal({
  matches,
  pred,
  rank,
  total,
}: {
  matches: MatchInfo[]
  pred: TeamPrediction
  rank: number
  total: number
}) {
  const t = await getT()
  const locale = await getLocale()
  const intl = await getIntlLocale()
  const path = teamPathToFinal(
    matches,
    pred.code,
    pred as unknown as Record<string, number>
  )
  if (!path || path.steps.length === 0) return null

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("team.pathHeading")}
        </h2>
        <span className="shrink-0 text-[11px] text-muted-2">
          {t("team.pathRankLine", { rank: ordinal(rank, intl), total })}
        </span>
      </div>
      <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border bg-card dark:inset-ring dark:inset-ring-white/5">
        {path.steps.map((s) => (
          <Link
            key={s.round}
            href={localeHref(locale, `/match/${s.match.match}`)}
            className="block transition-colors hover:bg-muted/20"
          >
            <div
              className={`flex items-center gap-3 px-4 py-3 ${s.exit ? "bg-loss/[0.06]" : ""}`}
            >
              <span className="w-11 shrink-0 rounded-md bg-muted/40 py-0.5 text-center font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {t(SHORT[s.round])}
              </span>
              <div className="min-w-0 flex-1">
                <OpponentLine s={s} code={pred.code} t={t} />
                <div
                  className="mt-0.5 truncate text-[10px] text-muted-2"
                  suppressHydrationWarning
                >
                  M{s.match.match} · <LocalTime utc={s.match.utc} mode="day" />{" "}
                  · {fifaCity(s.match.venue, s.match.city)}
                </div>
              </div>
              <div className="flex w-20 shrink-0 justify-end sm:w-24">
                <ReachChip s={s} t={t} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {path.champion ? (
        <p className="mt-2 text-xs font-medium text-contention">
          {t("team.pathChampions")}
        </p>
      ) : path.eliminatedAt ? (
        <p className="mt-2 text-xs text-pretty text-muted-foreground">
          {t("team.pathEliminated", { round: t(FULL[path.eliminatedAt]) })}
        </p>
      ) : (
        <p className="mt-2 text-xs text-pretty text-muted-2">
          {t("team.pathFootnote")}
        </p>
      )}
    </section>
  )
}

// The TEAM's own progress for this round — always team-oriented and labelled, so it can't be read as a
// statement about the opponent. ✓ reached (a fact: clinched the round or won the tie), a % chance to reach,
// or "out" at the exit.
function ReachChip({ s, t }: { s: PathStep; t: TFunction }) {
  if (s.exit) {
    return (
      <span className="shrink-0 rounded-md bg-loss/10 px-2 py-0.5 text-[11px] font-semibold text-loss">
        {t("team.pathOut")}
      </span>
    )
  }
  if ((s.played && s.teamWon) || s.inThisRound) {
    return (
      <span className="shrink-0 rounded-md bg-win/10 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-win">
        <span aria-hidden>✓ </span>
        {t("team.pathReached")}
      </span>
    )
  }
  return (
    <span className="shrink-0 text-right font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
      {t("team.pathToReach", { pct: forecastPct(s.reachProb) })}
    </span>
  )
}

function OpponentLine({
  s,
  code,
  t,
}: {
  s: PathStep
  code: string
  t: TFunction
}) {
  const m = s.match
  // Definite opponent — played result, or a mathematically clinched tie (shown with a lock, never a check).
  if (s.oppLocked) {
    const teamHome = m.home === code
    const ps = s.played && decidedOnPens(m) ? pensScore(m) : null
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <span className="shrink-0 text-xs text-muted-2">
          {s.played
            ? s.teamWon
              ? t("team.pathBeat")
              : t("team.pathLostTo")
            : t("common.vs")}
        </span>
        <Flag code={s.oppLocked.code} size={16} />
        <span
          className={`min-w-0 truncate ${s.exit ? "text-muted-foreground" : "font-semibold"}`}
        >
          {s.oppLocked.name}
        </span>
        {s.played ? (
          <span
            className={`shrink-0 font-mono text-xs tabular-nums ${s.teamWon ? "text-win" : "text-loss"}`}
          >
            {teamHome ? m.homeScore : m.awayScore}–
            {teamHome ? m.awayScore : m.homeScore}
            {ps && (
              <span className="text-muted-2">
                {" "}
                ({teamHome ? ps.home : ps.away}–{teamHome ? ps.away : ps.home}{" "}
                {t("common.pens")})
              </span>
            )}
          </span>
        ) : (
          // Lock = the OPPONENT is mathematically set (distinct from the team's "reached" ✓ on the right).
          <LockIcon title={t("team.pathOppConfirmed")} />
        )}
      </div>
    )
  }
  // Projected — lead opponent emphasised, alternatives muted underneath. The % is "chance this is the opponent".
  const [lead, ...alts] = s.oppCandidates
  if (!lead)
    return (
      <div className="text-sm text-muted-2">
        {t("common.vs")} {t("common.tbd")}
      </div>
    )
  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-xs text-muted-2">{t("common.vs")}</span>
        <Flag code={lead.code} size={16} />
        <span className="min-w-0 truncate font-semibold">{lead.name}</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {forecastPct(lead.prob)}
        </span>
      </div>
      {alts.length > 0 && (
        <div className="mt-0.5 truncate text-[11px] text-muted-2">
          {t("team.pathOr")}{" "}
          {alts.map((a) => `${a.name} ${forecastPct(a.prob)}`).join(" · ")}
        </div>
      )}
    </div>
  )
}

function LockIcon({ title }: { title: string }) {
  return (
    <span className="shrink-0 text-muted-2" title={title}>
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label={title}
      >
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    </span>
  )
}

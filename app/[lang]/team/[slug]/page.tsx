import Link from "next/link"
import { notFound } from "next/navigation"
import { getPredictions } from "@/lib/getPredictions"
import { getLiveMatches, overlayLive, liveActivity } from "@/lib/live"
import { finalizeGroups, ratingsFromTeams } from "@/lib/liveProjection"
import { TEAMS } from "@/lib/data/teams"
import { FIFA_RANK } from "@/lib/data/fifaRankings"
import { teamSlug, slugForCode, teamFromSlug } from "@/lib/slug"
import {
  localizeTeam,
  localizeTeams,
  localizeMatches,
  localizeGroups,
} from "@/lib/i18n/localize-payload"
import { Flag } from "@/components/flag"
import { ShareBar } from "@/components/share-bar"
import { LiveAutoRefresh } from "@/components/live-auto-refresh"
import { LocalTime } from "@/components/local-time"
import { AdvanceBadge } from "@/components/view/advance-badge"
import { R32ByFinish } from "@/components/r32-by-finish"
import { PathToFinal } from "@/components/path-to-final"
import { HotBadge } from "@/components/hot-badge"
import { computeWatchability } from "@/lib/watchability"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ExploreSection } from "@/components/explore-section"
import { BracketTeaser } from "@/components/bracket-teaser"
import { GroupsPreview } from "@/components/groups-preview"
import { TitleOdds } from "@/components/title-odds"
import { decidedOnPens, pensScore } from "@/lib/penalties"
import { hasReachedRound, isEliminated } from "@/lib/teamStatus"
import { teamAdvanceDisplay } from "@/lib/view/advance"
import { isClinched } from "@/lib/view/types"
import { forecastPct, ordinal } from "@/lib/format"
import { computeFinalRanking } from "@/lib/finalRanking"
import type { Metadata } from "next"
import { getT, getLocale } from "@/lib/i18n/server"
import { buildAlternates } from "@/lib/i18n/links"
import { localeHref, localeConfig } from "@/lib/i18n/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic" // per-request live overlay: a finished match shows its score at once

export function generateStaticParams() {
  return TEAMS.map((t) => ({ slug: teamSlug(t.name) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const team = teamFromSlug(slug)
  const t = await getT()
  const locale = await getLocale()
  if (!team) return { title: t("team.fallbackTitle") }
  const path = `/team/${slugForCode(team.code)}`
  const teamName = t(`teams.${team.code}`)
  const title = t("team.metaTitle", { team: teamName })
  const description = t("team.metaDesc", { team: teamName, group: team.group })
  return {
    title: { absolute: title },
    description,
    alternates: buildAlternates(path, locale),
    openGraph: {
      title,
      description,
      url: localeHref(locale, path),
      type: "article",
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

const ROUND_KEYS: [keyof RoundVals, string][] = [
  ["advance", "team.roundR32"],
  ["r16", "team.roundR16"],
  ["qf", "team.roundQF"],
  ["sf", "team.roundSF"],
  ["final", "team.roundFinal"],
  ["title", "team.roundChampion"],
]
type RoundVals = {
  advance: number
  r16: number
  qf: number
  sf: number
  final: number
  title: number
}

// Compact round label for the all-matches list (group stage + knockout rounds).
const ROUND_SHORT: Record<string, string> = {
  GROUP: "rounds.shortGroup",
  R32: "rounds.shortR32",
  R16: "rounds.shortR16",
  QF: "rounds.shortQF",
  SF: "rounds.shortSF",
  "3P": "rounds.shortThird",
  FINAL: "rounds.shortFinal",
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const team = teamFromSlug(slug)
  if (!team) notFound()
  const t = await getT()
  const locale = await getLocale()
  const [data, live] = await Promise.all([getPredictions(), getLiveMatches()])
  const overlaidRaw = overlayLive(data.matches, live)
  const hasLive = liveActivity(data.matches, live)
  const groupsRaw = hasLive
    ? finalizeGroups(data.groups, overlaidRaw, ratingsFromTeams(data.teams))
    : data.groups
  // Localize the FINAL structures the page renders (after live transforms re-derive English names).
  const teams = localizeTeams(data.teams, t)
  const groups = localizeGroups(groupsRaw, t)
  const overlaid = localizeMatches(overlaidRaw, t)
  const pred = teams.find((t) => t.code === team.code)
  // Localized display copy of THIS team (H1/hero/share). `pred` is already localized when present;
  // fall back to the team catalog (localizeTeam-equivalent) so the headline is always in-language.
  const lTeam = pred
    ? localizeTeam(pred, t)
    : { ...team, name: t(`teams.${team.code}`) }
  const rank = teams.findIndex((t) => t.code === team.code) + 1
  // World ranking context: our Elo strength rank (of the 48-team field) + the stored official FIFA ranking.
  const eloRank =
    [...data.teams]
      .sort((a, b) => (b.ratingExact ?? b.rating) - (a.ratingExact ?? a.rating))
      .findIndex((t) => t.code === team.code) + 1
  const fifaRank = FIFA_RANK[team.code]
  const isChampion = data.complete && data.champion === team.code
  const groupView = groups.find((g) => g.group === team.group)
  const row = groupView?.teams.find((t) => t.code === team.code)
  // Every match this team is actually in — group stage plus any knockout tie they've reached (resolved or
  // played). Projected future ties live in the "Road to the final" section above, not here.
  const fixtures = overlaid
    .filter((m) => m.home === team.code || m.away === team.code)
    .sort((a, b) => a.utc.localeCompare(b.utc))
  const hotByMatch = computeWatchability(overlaid, teams, groups).byMatch

  const advancePct = pred ? forecastPct(pred.advance) : "-"
  const titlePct = pred ? forecastPct(pred.title) : "-"
  // A clinched Round-of-32 place is a FACT (✓), never a capped forecast %. Derived from the SAME
  // AdvanceDisplay union the standings cell renders, so the funnel/lede can never disagree with the table.
  const advanceDisp = row
    ? teamAdvanceDisplay(row, groupRank(groupView, team.code) - 1)
    : undefined
  const advanceClinched = !!advanceDisp && isClinched(advanceDisp)
  const advanceOut = advanceDisp?.kind === "eliminated"
  // Knockout-aware finish (real results, not the sim): once a team clears its group its story is the bracket,
  // not the frozen "won the group" line. The final ranking gives the tier it reached and — for KO exits —
  // the exact place, so the lede reads "in the final" / "knocked out in the Quarter-finals, finishing 6th".
  const finish = computeFinalRanking(data.matches).find(
    (r) => r.code === team.code
  )
  const koFinal = finish?.tier === "FINAL" && finish.outcome !== "runnerUp"
  const koRunnerUp = finish?.outcome === "runnerUp"
  const koThird = finish?.tier === "THIRD" && !finish.outcome
  const koExitRound =
    finish?.tier === "QF" || finish?.tier === "R16" || finish?.tier === "R32"
      ? finish.tier
      : null
  const koPlace =
    finish?.settled && finish.rank
      ? ordinal(finish.rank, localeConfig(locale).intl)
      : ""
  // A team whose real story is the bracket (reached the final / play-off, or was knocked out of it).
  const koStory =
    koFinal ||
    koRunnerUp ||
    koThird ||
    finish?.outcome === "third" ||
    finish?.outcome === "fourth" ||
    !!koExitRound
  const statusWord =
    row?.status === "won_group"
      ? t("team.statusWonGroup")
      : row?.status === "second"
        ? t("team.statusSecond")
        : row?.status === "advanced"
          ? t("team.statusAdvanced")
          : row?.status === "eliminated"
            ? t("team.statusEliminated")
            : t("team.statusPlace", {
                place: row
                  ? ordinal(
                      groupRank(groupView, team.code),
                      localeConfig(locale).intl
                    )
                  : "",
                group: team.group,
              })

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <LiveAutoRefresh enabled={hasLive} />
      <Breadcrumbs
        items={[
          { label: t("team.homeCrumb"), href: localeHref(locale, "/") },
          { label: t("nav.groups"), href: localeHref(locale, "/groups") },
          {
            label: t("team.groupCrumb", { group: team.group }),
            href: localeHref(locale, `/group/${team.group.toLowerCase()}`),
          },
          { label: lTeam.name },
        ]}
      />
      <header className="mt-3 max-w-3xl">
        <div className="font-mono text-xs font-semibold tracking-wide text-primary uppercase">
          {t("team.eyebrow")} ·{" "}
          <Link
            href={localeHref(locale, `/group/${team.group.toLowerCase()}`)}
            className="hover:underline"
          >
            {t("team.groupCrumb", { group: team.group })}
          </Link>
        </div>
        <div className="mt-1.5 flex items-start gap-3">
          <span className="shrink-0">
            <Flag code={team.code} size={40} />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("team.heading", { team: lTeam.name })}
            </h1>
            <div className="mt-1 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-2 uppercase">
              {t("match.eloRank", { rank: eloRank })}
              {fifaRank != null && (
                <> · {t("match.fifaRank", { rank: fifaRank })}</>
              )}
            </div>
          </div>
        </div>
        {pred && isChampion && (
          <p className="mt-3 inline-flex items-center gap-2 text-base font-medium text-pretty text-foreground">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 text-contention"
              aria-hidden
            >
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
              <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
            </svg>
            {t("team.ledeChampion", { team: lTeam.name })}
          </p>
        )}
        {pred && !isChampion && koStory && (
          <p className="mt-3 text-sm text-pretty text-muted-foreground">
            {koFinal
              ? t("team.ledeInFinal", { team: lTeam.name, pct: titlePct })
              : koRunnerUp
                ? t("team.ledeRunnerUp", { team: lTeam.name })
                : koThird
                  ? t("team.ledeInThird", { team: lTeam.name })
                  : finish?.outcome === "third"
                    ? t("team.ledeThird", { team: lTeam.name })
                    : finish?.outcome === "fourth"
                      ? t("team.ledeFourth", { team: lTeam.name })
                      : t("team.ledeKnockedOut", {
                          team: lTeam.name,
                          round: t(`rounds.${koExitRound}`),
                          place: koPlace,
                        })}
          </p>
        )}
        {pred && !isChampion && !koStory && (
          <p className="mt-3 text-sm text-pretty text-muted-foreground">
            {t("team.ledePrefix", { team: lTeam.name, status: statusWord })}
            {advanceOut ? (
              <>{t("team.ledeOut", { group: team.group })}</>
            ) : advanceClinched ? (
              <>
                {t("team.ledeClinchedA")}{" "}
                <span className="font-medium text-foreground">{titlePct}</span>{" "}
                {t("team.ledeClinchedB")}{" "}
                <span className="font-medium text-foreground">
                  {ordinal(rank, localeConfig(locale).intl)}
                </span>
                {t("team.ledeClinchedC", { iterations: data.iterations })}
              </>
            ) : (
              <>
                {t("team.ledeRaceA")}{" "}
                <span className="font-medium text-foreground">
                  {advancePct}
                </span>{" "}
                {t("team.ledeRaceB")}{" "}
                <span className="font-medium text-foreground">{titlePct}</span>{" "}
                {t("team.ledeRaceC")}{" "}
                <span className="font-medium text-foreground">
                  {ordinal(rank, localeConfig(locale).intl)}
                </span>
                {t("team.ledeRaceD", { iterations: data.iterations })}
              </>
            )}
          </p>
        )}
        {pred && (
          <div className="mt-4">
            <ShareBar
              text={
                koFinal
                  ? t("team.shareInFinal", { team: lTeam.name, pct: titlePct })
                  : koRunnerUp
                    ? t("team.shareRunnerUp", { team: lTeam.name })
                    : koThird ||
                        finish?.outcome === "third" ||
                        finish?.outcome === "fourth"
                      ? t("team.shareSemi", { team: lTeam.name })
                      : koExitRound
                        ? t("team.shareKnockedOut", {
                            team: lTeam.name,
                            round: t(`rounds.${koExitRound}`),
                          })
                        : advanceClinched
                          ? t("team.shareClinched", {
                              team: lTeam.name,
                              title: titlePct,
                            })
                          : advanceOut
                            ? t("team.shareOut", { team: lTeam.name })
                            : t("team.shareRace", {
                                team: lTeam.name,
                                advance: advancePct,
                                title: titlePct,
                              })
              }
              path={`/team/${slug}`}
            />
          </div>
        )}
      </header>

      {pred && (
        <section className="mt-8">
          <h2 className="mb-3 font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("team.roundsHeading")}
          </h2>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-6">
            {ROUND_KEYS.map(([key, labelKey]) => {
              const label = t(labelKey)
              const v = (pred as unknown as RoundVals)[key]
              // ✓ once it's a FACT (clinched R32 via the group, or resolved into a later round by actually
              // winning), "out" once eliminated, else the capped Monte Carlo forecast — never 99% for a round
              // the team has already reached.
              const reached =
                isChampion ||
                (key === "advance"
                  ? advanceClinched
                  : hasReachedRound(overlaid, team.code, key))
              const teamOut =
                advanceOut ||
                isEliminated(overlaid, team.code, pred.advance ?? 0)
              const showOut = !reached && teamOut
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1 bg-card px-2 py-4"
                  style={{ backgroundColor: heat(reached ? 1 : v) }}
                >
                  <span className="text-[10px] font-medium tracking-wide text-muted-2 uppercase">
                    {label}
                  </span>
                  <span
                    className={`font-mono text-lg font-bold tabular-nums ${reached ? "text-win" : key === "title" ? "text-primary" : ""}`}
                  >
                    {reached ? (
                      <span className="inline-flex items-center justify-center leading-none">
                        ✓
                      </span>
                    ) : showOut ? (
                      t("team.outShort")
                    ) : (
                      forecastPct(v)
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {pred && !advanceOut && (
        <PathToFinal
          matches={overlaid}
          pred={pred}
          rank={rank}
          total={teams.length}
        />
      )}

      {/* The finish-scenario R32 breakdown only matters while the group is still in play; once it's decided
          the path's R32 row already carries the locked opponent, so this would just repeat it. */}
      {pred && !advanceOut && !groupView?.decided && (
        <R32ByFinish matches={overlaid} group={team.group} pred={pred} />
      )}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-5">
        {groupView && (
          <section className="lg:col-span-3">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("team.groupStandingsHeading", { group: team.group })}
              </h2>
              <Link
                href={localeHref(locale, `/group/${team.group.toLowerCase()}`)}
                className="text-xs text-primary"
              >
                {t("team.fullGroupLink")}
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] tracking-wide text-muted-foreground">
                    <th className="w-6 py-1.5 pr-1 pl-3 text-left font-medium" />
                    <th className="py-1.5 text-left font-medium">
                      {t("groups.colTeam")}
                    </th>
                    <th
                      className="px-1 text-center font-medium"
                      title={t("groups.colPlayedTitle")}
                    >
                      {t("groups.colPlayed")}
                    </th>
                    <th
                      className="px-1 text-center font-medium"
                      title={t("groups.colGdTitle")}
                    >
                      {t("groups.colGd")}
                    </th>
                    <th
                      className="px-1 text-center font-semibold"
                      title={t("groups.colPtsTitle")}
                    >
                      {t("groups.colPts")}
                    </th>
                    <th className="px-2 pr-3 text-right font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {groupView.teams.map((tm, i) => {
                    const me = tm.code === team.code
                    return (
                      <tr
                        key={tm.code}
                        className={`border-b border-border/50 last:border-0 ${me ? "bg-primary/[0.06]" : ""} ${i < 2 ? "border-l-win" : i === 2 ? "border-l-contention" : "border-l-transparent"} border-l-2`}
                      >
                        <td className="w-6 py-2 pr-1 pl-3 font-mono text-[11px] text-muted-2">
                          {i + 1}
                        </td>
                        <td className="py-2">
                          <Link
                            href={localeHref(
                              locale,
                              `/team/${slugForCode(tm.code)}`
                            )}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Flag code={tm.code} size={18} />
                            <span
                              className={`truncate text-[13px] ${me ? "font-semibold" : "font-medium"}`}
                            >
                              {tm.name}
                            </span>
                          </Link>
                        </td>
                        <td className="px-1 text-center font-mono text-xs text-muted-foreground tabular-nums">
                          {tm.played}
                        </td>
                        <td className="px-1 text-center font-mono text-xs tabular-nums">
                          {tm.gd >= 0 ? "+" : ""}
                          {tm.gd}
                        </td>
                        <td className="px-1 text-center font-mono text-[13px] font-bold tabular-nums">
                          {tm.pts}
                        </td>
                        <td className="px-2 pr-3 text-right">
                          <AdvanceBadge d={teamAdvanceDisplay(tm, i)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {fixtures.length > 0 && (
          <section className="lg:col-span-2">
            <h2 className="mb-3 font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("team.allMatchesHeading", { team: lTeam.name })}
            </h2>
            <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border bg-card">
              {fixtures.map((m) => {
                const final = m.status === "final"
                const live = m.status === "live"
                const isHome = m.home === team.code
                // Resolved opponent, else the projected most-likely opponent (muted) for an upcoming knockout tie.
                const oppProj = (isHome ? m.projAway : m.projHome)?.[0]
                const oppResolved = !!(isHome ? m.away : m.home)
                const oppCode =
                  (isHome ? m.away : m.home) ?? oppProj?.code ?? null
                const oppName =
                  (isHome ? m.awayName : m.homeName) ??
                  oppProj?.name ??
                  t("common.tbd")
                const ps = final && decidedOnPens(m) ? pensScore(m) : null
                return (
                  <Link
                    key={m.match}
                    href={localeHref(locale, `/match/${m.match}`)}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <span className="w-16 shrink-0 text-muted-2 sm:w-24">
                      <span
                        className="block font-mono text-[11px] whitespace-nowrap"
                        suppressHydrationWarning
                      >
                        <LocalTime utc={m.utc} mode="day" />
                      </span>
                      <span className="block text-[10px] leading-tight">
                        {t(ROUND_SHORT[m.round] ?? "")}
                        {m.round === "GROUP" && m.group ? ` ${m.group}` : ""}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("common.vs")}
                    </span>
                    <Flag code={oppCode} size={18} />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${oppResolved ? "" : "text-muted-foreground"}`}
                    >
                      {oppName}
                    </span>
                    {hotByMatch.get(m.match)?.hot && (
                      <HotBadge className="shrink-0" />
                    )}
                    {final || live ? (
                      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                        {isHome ? m.homeScore : m.awayScore}–
                        {isHome ? m.awayScore : m.homeScore}
                        {ps && (
                          <span className="ms-1 text-[11px] font-normal text-muted-2">
                            ({isHome ? ps.home : ps.away}–
                            {isHome ? ps.away : ps.home} {t("common.pens")})
                          </span>
                        )}
                      </span>
                    ) : m.favorite && m.favorite.code === team.code ? (
                      <span className="shrink-0 text-[11px] text-muted-2">
                        {t("team.favored")}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <ExploreSection
        title={t("team.exploreTitle")}
        links={[
          {
            label: t("team.groupCrumb", { group: team.group }),
            href: localeHref(locale, `/group/${team.group.toLowerCase()}`),
            hint: t("team.standingsHint"),
          },
          {
            label: t("team.fullScheduleLink"),
            href: localeHref(locale, "/schedule"),
          },
          {
            label: t("team.howItWorksLink"),
            href: localeHref(locale, "/methodology"),
          },
        ]}
      >
        <BracketTeaser matches={overlaid} teams={teams} />
        <GroupsPreview groups={groups} />
        <TitleOdds teams={teams} />
      </ExploreSection>

      <p className="mt-8 text-xs text-muted-2">
        {t("team.footerOdds", { iterations: data.iterations })}{" "}
        <Link
          href={localeHref(locale, "/methodology")}
          className="text-primary"
        >
          {t("team.howItWorksArrow")}
        </Link>
      </p>
    </main>
  )
}

function heat(v: number): string {
  return `color-mix(in oklab, var(--primary) ${Math.round(Math.min(v, 1) * 22)}%, transparent)`
}
function groupRank(
  gv: { teams: { code: string }[] } | undefined,
  code: string
): number {
  return (gv?.teams.findIndex((t) => t.code === code) ?? 0) + 1
}

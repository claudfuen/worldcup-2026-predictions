import Link from "next/link"
import { Flag } from "@/components/flag"
import { Delta } from "@/components/delta"
import { forecastPct } from "@/lib/format"
import { slugForCode } from "@/lib/slug"
import { getT, getLocale, getIntlLocale } from "@/lib/i18n/server"
import { localeHref } from "@/lib/i18n/config"
import { decidedOnPens } from "@/lib/penalties"
import type { MatchInfo, TeamPrediction } from "@/lib/predictions"

// The masthead: the model's call, stated as a confident but COMPACT editorial header — never the loudest thing
// on the page. The tournament itself (the live games, the bracket, the races) is the interesting part, so the
// season-long title odds are a tight top-of-page lede that hands off quickly to what's actually happening. A
// slim contender strip shows the shape of the race (flags + %) without a dominating hero stat. Never
// definitive — the champion state is the one exception, sourced from the settled final, not the sim.
export async function MastheadVerdict({
  teams,
  iterations,
  complete,
  champion,
  finalMatch,
}: {
  teams: TeamPrediction[]
  iterations: number
  complete?: boolean
  champion?: string
  finalMatch?: MatchInfo
}) {
  const t = await getT()
  const locale = await getLocale()
  const intl = await getIntlLocale()
  const [c1, c2] = teams
  if (!c1) return null

  // ---- Champion crowned: a settled fact (gold, no probability) ----
  const champ =
    complete && champion ? teams.find((tm) => tm.code === champion) : undefined
  if (champ) {
    const finalOnPens =
      finalMatch &&
      decidedOnPens(finalMatch) &&
      finalMatch.homePens != null &&
      finalMatch.awayPens != null
    const champPens = finalOnPens
      ? finalMatch!.winner === finalMatch!.home
        ? finalMatch!.homePens!
        : finalMatch!.awayPens!
      : null
    const oppPens = finalOnPens
      ? finalMatch!.winner === finalMatch!.home
        ? finalMatch!.awayPens!
        : finalMatch!.homePens!
      : null
    return (
      <div>
        <div className="eyebrow text-contention">
          {t("home.championEyebrow")}
        </div>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          <TrophyIcon />
          <span>
            <Link
              href={localeHref(locale, `/team/${slugForCode(champ.code)}`)}
              className="decoration-contention/40 underline-offset-4 hover:underline"
            >
              {champ.name}
            </Link>{" "}
            <span className="font-normal text-muted-foreground">
              {t("home.areChampions")}
            </span>
          </span>
        </h1>
        <div className="mt-3 flex items-center gap-2.5">
          <Flag code={champ.code} size={22} />
          <span className="text-sm text-muted-foreground">
            {finalOnPens
              ? t("home.championOnPens", { score: `${champPens}–${oppPens}` })
              : t("home.championLine")}
          </span>
        </div>
      </div>
    )
  }

  const close = c2 != null && c1.title - c2.title < 0.02
  // A slim contender strip — the shape of the title race in one glance (flags + %), the leader emphasized.
  // Only teams still mathematically alive: once the field narrows (e.g. two finalists left), eliminated sides
  // must NOT pad the strip at a bare 0%.
  const alive = teams.filter((tm) => tm.title > 0)
  const strip = (alive.length ? alive : teams).slice(0, close ? 4 : 5)

  return (
    <div>
      <div className="eyebrow text-primary">{t("home.modelsCall")}</div>
      {close ? (
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("home.tooCloseToCall")}
        </h1>
      ) : (
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          <Link
            href={localeHref(locale, `/team/${slugForCode(c1.code)}`)}
            className="decoration-primary/40 underline-offset-4 hover:underline"
          >
            {c1.name}
          </Link>{" "}
          <span className="font-normal text-muted-foreground">
            {t("home.toWinItAll")}
          </span>
        </h1>
      )}

      <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {strip.map((tm, i) => (
          <Link
            key={tm.code}
            href={localeHref(locale, `/team/${slugForCode(tm.code)}`)}
            className="group inline-flex items-baseline gap-1.5"
          >
            <Flag code={tm.code} size={15} />
            <span
              className={`${i === 0 ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
            >
              {tm.name}
            </span>
            <span
              className={`font-mono text-sm tabular-nums ${i === 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}
            >
              {forecastPct(tm.title)}
            </span>
            {i === 0 && <Delta v={tm.titleDelta} />}
          </Link>
        ))}
      </div>

      <p className="mt-3 max-w-2xl text-sm text-pretty text-muted-foreground">
        {t("home.simsTagline", { count: iterations.toLocaleString(intl) })}
      </p>
    </div>
  )
}

// Gold trophy for the champion crown.
function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="34"
      height="34"
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
  )
}

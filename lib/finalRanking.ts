import type { MatchInfo } from "./predictions"
import { decidedOnPens } from "./penalties"
import { TEAMS, TEAM_BY_CODE } from "./data/teams"

// The official FIFA final tournament ranking (1 → last), computed from the REAL results only — never the
// simulation. FIFA's method:
//   1. 1st/2nd from the final; 3rd/4th from the third-place play-off.
//   2. Everyone else is ranked first by the STAGE they reached (QF-out above R16-out above R32-out above
//      group-out).
//   3. Within a stage, by points (3/1/0 across ALL matches, a KO tie won on penalties counting as a DRAW),
//      then goal difference, then goals scored (fair-play / drawing of lots beyond that — not modelled).
// Positions that depend on a match not yet played stay UNSETTLED (the final and third-place play-off), so
// the two finalists share ranks 1–2 and the two play-off teams share 3–4 until those games are decided.

export type FinishTier =
  | "FINAL"
  | "THIRD"
  | "QF"
  | "R16"
  | "R32"
  | "GROUP"
  | "ALIVE"

export interface RankedTeam {
  code: string
  name: string
  group: string
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  gd: number
  points: number
  tier: FinishTier
  rank?: number // exact 1-based place once settled; a range (rankLo–rankHi) otherwise
  rankLo: number // best possible place in this tier
  rankHi: number // worst possible place in this tier
  settled: boolean // final placement is decided (the deciding match has been played)
  outcome?: "champion" | "runnerUp" | "third" | "fourth" // set only when settled at the top
}

const KO_ROUND_RANK: Record<string, number> = {
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 4,
  FINAL: 5,
}

// Tier ordering + the contiguous rank block each tier owns (2 finalists, 2 play-off, 4 QF-out, 8 R16-out,
// 16 R32-out, 16 group-out = 48). ALIVE (still in the KO but not yet a finalist / play-off team — only
// possible mid-knockout) sits above everyone; it borrows the top block and is always unsettled.
const TIER_ORDER: FinishTier[] = [
  "ALIVE",
  "FINAL",
  "THIRD",
  "QF",
  "R16",
  "R32",
  "GROUP",
]
const TIER_BLOCK: Record<FinishTier, { lo: number; hi: number }> = {
  ALIVE: { lo: 1, hi: 1 },
  FINAL: { lo: 1, hi: 2 },
  THIRD: { lo: 3, hi: 4 },
  QF: { lo: 5, hi: 8 },
  R16: { lo: 9, hi: 16 },
  R32: { lo: 17, hi: 32 },
  GROUP: { lo: 33, hi: 48 },
}

interface Agg {
  played: number
  win: number
  draw: number
  loss: number
  gf: number
  ga: number
  points: number
}

function emptyAgg(): Agg {
  return { played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, points: 0 }
}

/**
 * Whether a meaningful final-ranking table can be shown yet — i.e. the knockouts have begun, so at least one
 * team has been eliminated. Before that there are no placements to report.
 */
export function finalRankingReady(matches: MatchInfo[]): boolean {
  return matches.some((m) => m.round !== "GROUP" && m.status === "final")
}

export function computeFinalRanking(matches: MatchInfo[]): RankedTeam[] {
  const done = matches.filter(
    (m) => m.status === "final" && m.homeScore != null && m.awayScore != null
  )

  // Per-team tournament aggregate across every completed match (group + knockout).
  const agg = new Map<string, Agg>()
  const bump = (code: string) => {
    let a = agg.get(code)
    if (!a) agg.set(code, (a = emptyAgg()))
    return a
  }
  for (const m of done) {
    if (!m.home || !m.away) continue
    const hs = m.homeScore!
    const as = m.awayScore!
    const h = bump(m.home)
    const a = bump(m.away)
    h.played++
    a.played++
    h.gf += hs
    h.ga += as
    a.gf += as
    a.ga += hs
    // A knockout tie won on penalties counts as a DRAW for points (both teams +1); otherwise the
    // regulation/ET score decides. Group draws are ordinary draws.
    const pens = decidedOnPens(m)
    if (hs === as || pens) {
      h.draw++
      a.draw++
      h.points += 1
      a.points += 1
    } else if (hs > as) {
      h.win++
      a.loss++
      h.points += 3
    } else {
      a.win++
      h.loss++
      a.points += 3
    }
  }

  // Who lost each knockout match (the non-advancing side), and which round it was.
  const koLossRound = new Map<string, number>() // team → the round-rank at which it was knocked out
  const koParticipant = new Set<string>()
  const finalMatch = matches.find((m) => m.round === "FINAL")
  const thirdMatch = matches.find((m) => m.round === "3P")
  for (const m of matches) {
    const rr = KO_ROUND_RANK[m.round] // group/3P are handled separately
    if (rr == null) continue
    if (m.home) koParticipant.add(m.home)
    if (m.away) koParticipant.add(m.away)
    if (m.status !== "final" || !m.winner || !m.home || !m.away) continue
    const loser = m.winner === m.home ? m.away : m.home
    koLossRound.set(loser, rr)
  }

  const finalists = new Set(
    [finalMatch?.home, finalMatch?.away].filter(Boolean) as string[]
  )
  // Third-place teams = the two semi-final losers (the play-off participants, known the moment the SFs end,
  // before the play-off itself is scheduled with real teams).
  const sfLosers = new Set<string>()
  for (const m of matches) {
    if (
      m.round !== "SF" ||
      m.status !== "final" ||
      !m.winner ||
      !m.home ||
      !m.away
    )
      continue
    sfLosers.add(m.winner === m.home ? m.away : m.home)
  }

  const tierOf = (code: string): FinishTier => {
    if (finalists.has(code)) return "FINAL"
    if (sfLosers.has(code)) return "THIRD"
    const lr = koLossRound.get(code)
    if (lr === KO_ROUND_RANK.QF) return "QF"
    if (lr === KO_ROUND_RANK.R16) return "R16"
    if (lr === KO_ROUND_RANK.R32) return "R32"
    // Reached the knockouts but neither eliminated nor a finalist/play-off team ⇒ still alive mid-KO.
    if (koParticipant.has(code) && lr == null) return "ALIVE"
    return "GROUP"
  }

  const rows: RankedTeam[] = TEAMS.map((tm) => {
    const a = agg.get(tm.code) ?? emptyAgg()
    const tier = tierOf(tm.code)
    return {
      code: tm.code,
      name: TEAM_BY_CODE[tm.code]?.name ?? tm.code,
      group: tm.group,
      played: a.played,
      win: a.win,
      draw: a.draw,
      loss: a.loss,
      gf: a.gf,
      ga: a.ga,
      gd: a.gf - a.ga,
      points: a.points,
      tier,
      rankLo: TIER_BLOCK[tier].lo,
      rankHi: TIER_BLOCK[tier].hi,
      settled: false,
    }
  })

  // Sort within each tier by the official tiebreakers, then assign the contiguous rank block.
  const byTier = new Map<FinishTier, RankedTeam[]>()
  for (const r of rows) {
    const list = byTier.get(r.tier) ?? []
    list.push(r)
    byTier.set(r.tier, list)
  }
  const cmp = (x: RankedTeam, y: RankedTeam) =>
    y.points - x.points ||
    y.gd - x.gd ||
    y.gf - x.gf ||
    x.name.localeCompare(y.name)

  const out: RankedTeam[] = []
  for (const tier of TIER_ORDER) {
    const list = (byTier.get(tier) ?? []).sort(cmp)
    if (!list.length) continue
    const { lo } = TIER_BLOCK[tier]

    if (
      tier === "FINAL" &&
      finalMatch?.status === "final" &&
      finalMatch.winner
    ) {
      // Champion / runner-up are settled facts, not tiebreaker output.
      const champ = list.find((r) => r.code === finalMatch.winner)!
      const runner = list.find((r) => r.code !== finalMatch.winner)!
      champ.rank = 1
      champ.settled = true
      champ.outcome = "champion"
      runner.rank = 2
      runner.settled = true
      runner.outcome = "runnerUp"
      out.push(champ, runner)
      continue
    }
    if (
      tier === "THIRD" &&
      thirdMatch?.status === "final" &&
      thirdMatch.winner
    ) {
      const third = list.find((r) => r.code === thirdMatch.winner)!
      const fourth = list.find((r) => r.code !== thirdMatch.winner)!
      third.rank = 3
      third.settled = true
      third.outcome = "third"
      fourth.rank = 4
      fourth.settled = true
      fourth.outcome = "fourth"
      out.push(third, fourth)
      continue
    }

    // Fully-decided lower tiers get exact sequential places; the still-to-be-decided top tiers keep their
    // shared range (rankLo–rankHi) and stay unsettled.
    const decided = tier !== "ALIVE" && tier !== "FINAL" && tier !== "THIRD"
    list.forEach((r, i) => {
      if (decided) {
        r.rank = lo + i
        r.settled = true
      }
      out.push(r)
    })
  }

  return out
}

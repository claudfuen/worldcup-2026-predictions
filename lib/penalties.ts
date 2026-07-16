import type { MatchInfo } from "./predictions"

// Penalty-shootout helpers — the single source of truth for "was this knockout tie decided on penalties,
// and what was the shootout score". Every surface that renders a result reads these so the treatment stays
// consistent (regulation/ET score as the primary line, the shootout tally as a secondary annotation).

type PenFields = Pick<
  MatchInfo,
  | "status"
  | "round"
  | "homeScore"
  | "awayScore"
  | "winner"
  | "homePens"
  | "awayPens"
>

// True when a finished knockout tie was settled by a penalty shootout. Primary signal is the shootout tally
// (set from ESPN's shootoutScore). Falls back to the structural signature — a level regulation/ET score WITH
// an advancing team — so it still reads right in the brief window after full-time before the tally lands.
// Never true in the group stage, where a draw simply stands.
export function decidedOnPens(m: PenFields): boolean {
  if (m.status !== "final" || m.round === "GROUP") return false
  if (m.homePens != null && m.awayPens != null) return true
  return (
    m.winner != null &&
    m.homeScore != null &&
    m.awayScore != null &&
    m.homeScore === m.awayScore
  )
}

// The shootout scoreline in home–away orientation, once known (null if the tie went to penalties but the
// tally hasn't arrived yet, or it wasn't a shootout). Mirrors homeScore/awayScore so callers render it the
// same way they render the regulation score.
export function pensScore(
  m: Pick<MatchInfo, "homePens" | "awayPens">
): { home: number; away: number } | null {
  return m.homePens != null && m.awayPens != null
    ? { home: m.homePens, away: m.awayPens }
    : null
}

// Which side won the shootout, when the tally is known. (The advancing team is m.winner regardless; this is
// just for emphasising the right number in the pen scoreline.)
export function pensWinnerSide(
  m: Pick<MatchInfo, "homePens" | "awayPens">
): "home" | "away" | null {
  if (m.homePens == null || m.awayPens == null) return null
  return m.homePens > m.awayPens ? "home" : "away"
}

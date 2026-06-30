import type { MatchInfo } from "./predictions";

// Trace a team's single most-likely road through the knockout bracket to the final — the answer to
// "who would my team have to beat to win it?". We anchor at the team's Round-of-32 match (its resolved
// slot if known, else the R32 match it's most likely to fill) and walk forward along the winner feeders
// (W## → the one match that consumes it), reading the OTHER side of each node as the opponent.
//
// Honours the app's two-notions-of-certainty rule: an opponent that's mathematically locked (or a match
// already played) is returned as a definite team; an unresolved opponent is returned as the top-N most
// likely candidates with probabilities (lead first). A played match the team LOST ends the road (the exit).

export type PathRound = "R32" | "R16" | "QF" | "SF" | "FINAL";

const REACH_KEY: Record<PathRound, "advance" | "r16" | "qf" | "sf" | "final"> = {
  R32: "advance", R16: "r16", QF: "qf", SF: "sf", FINAL: "final",
};

export interface PathCandidate { code: string; name: string; prob: number }

export interface PathStep {
  round: PathRound;
  match: MatchInfo; // the bracket node (for link / time / venue / score)
  reachProb: number; // P(team reaches this round) from the Monte Carlo
  inThisRound: boolean; // team is a resolved/clinched participant of this match — reaching the round is a FACT
  played: boolean; // this match has a final result
  teamWon: boolean | null; // when played: did the team advance (incl. on penalties)
  exit: boolean; // team was eliminated here (played and did not advance)
  oppLocked: { code: string; name: string } | null; // a single, definite opponent (clinched or played)
  oppCandidates: PathCandidate[]; // else the top-N projected opponents (lead first)
}

export interface TeamPath {
  steps: PathStep[];
  champion: boolean; // won the final
  eliminatedAt: PathRound | null; // the round the run ended, if it has
}

type Reach = Record<string, number>;

/** Build a team's projected/known path to the final. Returns null if the team can't be placed in any R32 match. */
export function teamPathToFinal(matches: MatchInfo[], code: string, reach: Reach): TeamPath | null {
  const r32 = matches.filter((m) => m.round === "R32");

  // Anchor: the team's resolved R32 slot if known, else the R32 match it's most likely to fill.
  let anchor: { m: MatchInfo; side: "home" | "away" } | null = null;
  for (const m of r32) {
    if (m.home === code) { anchor = { m, side: "home" }; break; }
    if (m.away === code) { anchor = { m, side: "away" }; break; }
  }
  if (!anchor) {
    let best = 0;
    for (const m of r32) {
      const hp = m.projHome?.find((c) => c.code === code)?.prob ?? 0;
      const ap = m.projAway?.find((c) => c.code === code)?.prob ?? 0;
      if (hp > best) { best = hp; anchor = { m, side: "home" }; }
      if (ap > best) { best = ap; anchor = { m, side: "away" }; }
    }
  }
  if (!anchor) return null;

  const steps: PathStep[] = [];
  let cur: MatchInfo | undefined = anchor.m;
  let side: "home" | "away" = anchor.side;
  let eliminatedAt: PathRound | null = null;
  let champion = false;

  while (cur) {
    const round = cur.round as PathRound;
    const resolvedHome = cur.home === code;
    const resolvedAway = cur.away === code;
    const inThisRound = resolvedHome || resolvedAway;
    const mySide: "home" | "away" = inThisRound ? (resolvedHome ? "home" : "away") : side;
    const oppSide = mySide === "home" ? "away" : "home";
    const oppCode = oppSide === "home" ? cur.home : cur.away;
    const oppName = oppSide === "home" ? cur.homeName : cur.awayName;
    const oppProj = (oppSide === "home" ? cur.projHome : cur.projAway) ?? [];
    const played = cur.status === "final";
    const teamWon = played ? cur.winner === code : null;
    const exit = played && teamWon === false;

    steps.push({
      round,
      match: cur,
      reachProb: reach[REACH_KEY[round]] ?? 0,
      inThisRound,
      played,
      teamWon,
      exit,
      oppLocked: oppCode && oppName ? { code: oppCode, name: oppName } : null,
      oppCandidates: oppCode ? [] : oppProj.slice(0, 3).map((c) => ({ code: c.code, name: c.name, prob: c.prob })),
    });

    if (exit) { eliminatedAt = round; break; }
    if (round === "FINAL") { if (played && teamWon) champion = true; break; }

    // Walk to the one match the winner of `cur` feeds into.
    const w: string = `W${cur.match}`;
    const next: MatchInfo | undefined = matches.find((m) => m.slotHome === w || m.slotAway === w);
    if (!next) break;
    side = next.slotHome === w ? "home" : "away";
    cur = next;
  }

  return { steps, champion, eliminatedAt };
}

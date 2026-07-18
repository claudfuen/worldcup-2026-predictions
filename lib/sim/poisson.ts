// Scoreline model: map an Elo rating gap to two Poisson goal rates, then sample/score.
// Backtested params (sup_div, totalGoals) reproduce the direct-Elo W/D/L accuracy while ALSO yielding scorelines
// needed for goal-difference tiebreakers. Dixon-Coles low-score correction kept small (best-fit rho was ~0).
import { samplePoisson } from "./rng"

export const POISSON_CONFIG = { supDiv: 220, totalGoals: 2.6, rho: 0.05 }

// Returns [lambdaHome, lambdaAway] expected goals from the (home-perspective) rating gap.
export function eloToLambdas(
  ratingDiff: number,
  cfg: { supDiv?: number; totalGoals?: number } = {}
): [number, number] {
  const supDiv = cfg.supDiv ?? POISSON_CONFIG.supDiv
  const total = cfg.totalGoals ?? POISSON_CONFIG.totalGoals
  const sup = ratingDiff / supDiv
  return [Math.max((total + sup) / 2, 0.05), Math.max((total - sup) / 2, 0.05)]
}

export function poissonPmf(lambda: number, k: number): number {
  let f = 1
  for (let i = 2; i <= k; i++) f *= i
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / f
}

// Win/Draw/Loss probabilities from two Poisson goal rates, with Dixon-Coles low-score correction.
export function wdlFromLambdas(
  lh: number,
  la: number,
  rho = POISSON_CONFIG.rho,
  maxG = 10
): { win: number; draw: number; loss: number } {
  let win = 0,
    draw = 0,
    loss = 0
  for (let i = 0; i <= maxG; i++) {
    for (let j = 0; j <= maxG; j++) {
      let p = poissonPmf(lh, i) * poissonPmf(la, j)
      if (i <= 1 && j <= 1) p *= dcTau(i, j, lh, la, rho)
      if (i > j) win += p
      else if (i === j) draw += p
      else loss += p
    }
  }
  const s = win + draw + loss
  return { win: win / s, draw: draw / s, loss: loss / s }
}

// Win/Draw/Loss probabilities (home perspective) from the rating gap.
export function wdlProbs(
  ratingDiff: number,
  cfg: {
    supDiv?: number
    totalGoals?: number
    rho?: number
    maxGoals?: number
  } = {}
): { win: number; draw: number; loss: number } {
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  return wdlFromLambdas(
    lh,
    la,
    cfg.rho ?? POISSON_CONFIG.rho,
    cfg.maxGoals ?? 10
  )
}

// Most-likely exact scorelines from the rating gap, descending by probability (normalized over the grid).
export function scorelineDist(
  ratingDiff: number,
  cfg: { supDiv?: number; totalGoals?: number; rho?: number } = {},
  maxG = 6
): { h: number; a: number; prob: number }[] {
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  const rho = cfg.rho ?? POISSON_CONFIG.rho
  const out: { h: number; a: number; prob: number }[] = []
  let s = 0
  for (let i = 0; i <= maxG; i++) {
    for (let j = 0; j <= maxG; j++) {
      let p = poissonPmf(lh, i) * poissonPmf(la, j)
      if (i <= 1 && j <= 1) p *= dcTau(i, j, lh, la, rho)
      out.push({ h: i, a: j, prob: p })
      s += p
    }
  }
  for (const o of out) o.prob /= s
  out.sort((a, b) => b.prob - a.prob)
  return out
}

// Probability the home/first side ADVANCES in a knockout: regulation, then ~1/3-length extra time,
// then a coin-flip shootout on the remaining tie mass. Removes the favorite over-statement of bare Elo We.
// The third-place play-off is the one knockout with NO extra time (FIFA rule): a level regulation goes
// straight to penalties, so pass noExtraTime to send the draw mass directly to the coin-flip shootout.
function koAdvanceRaw(
  ratingDiff: number,
  cfg: { supDiv?: number; totalGoals?: number; rho?: number },
  noExtraTime = false
): number {
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  const rho = cfg.rho ?? POISSON_CONFIG.rho
  const reg = wdlFromLambdas(lh, la, rho, 8)
  if (noExtraTime) return reg.win + reg.draw * 0.5 // straight to a coin-flip shootout
  const et = wdlFromLambdas(lh * 0.33, la * 0.33, rho, 8) // extra time ~ 1/3 of a match
  return reg.win + reg.draw * (et.win + et.draw * 0.5)
}
// Memoized on the default config (smooth in ratingDiff; bucket to 4 Elo for a large Monte Carlo speedup).
// Separate caches for the ET and no-ET (third-place) variants.
const koCache = new Map<number, number>()
const koCacheNoET = new Map<number, number>()
export function koAdvanceProb(
  ratingDiff: number,
  cfg: { supDiv?: number; totalGoals?: number; rho?: number } = {},
  noExtraTime = false
): number {
  if (cfg.supDiv == null && cfg.totalGoals == null && cfg.rho == null) {
    const cache = noExtraTime ? koCacheNoET : koCache
    const key = Math.round(ratingDiff / 4)
    let v = cache.get(key)
    if (v === undefined) {
      v = koAdvanceRaw(key * 4, cfg, noExtraTime)
      cache.set(key, v)
    }
    return v
  }
  return koAdvanceRaw(ratingDiff, cfg, noExtraTime)
}

function dcTau(
  i: number,
  j: number,
  lh: number,
  la: number,
  rho: number
): number {
  if (i === 0 && j === 0) return 1 - lh * la * rho
  if (i === 0 && j === 1) return 1 + lh * rho
  if (i === 1 && j === 0) return 1 + la * rho
  if (i === 1 && j === 1) return 1 - rho
  return 1
}

// Sample a regulation scoreline for the Monte Carlo (independent Poisson; DC correction is negligible at rho~0.05).
export function sampleScoreline(
  ratingDiff: number,
  rand: () => number,
  cfg = {}
): [number, number] {
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  return [samplePoisson(lh, rand), samplePoisson(la, rand)]
}

// ── Live (in-progress) conditioning ─────────────────────────────────────────────────────────────────
// A match that's underway is NOT a fresh 90 minutes: its outcome is the CURRENT score plus whatever is
// scored in the time that remains. We model the remaining minutes as Poisson with the same per-match goal
// rates scaled by the fraction of the match left, then add them to the goals already on the board. So a
// side leading 1-0 with little time left is a heavy favourite; at kickoff (frac=1, 0-0) this collapses
// back to the ordinary pre-match read.

/** Fraction of a 90' match still to play given elapsed minutes. Floored at a small sliver: until the final
 *  whistle there is always stoppage-time variance, so a live match never reads a definitive 0%/100% — a
 *  trailing side keeps a "<1%" chance. Unknown minute -> a full match remaining. */
export function fracRemaining(minute: number | null | undefined): number {
  if (minute == null || !isFinite(minute)) return 1
  return Math.max(0.03, Math.min(1, (90 - minute) / 90))
}

// Win/Draw/Loss (home perspective) for the FINAL result given the live score (hg-ag) and the fraction of
// the match remaining. Convolves the remaining-time Poisson onto the current score. Independent Poisson
// (no Dixon-Coles: the correction is on absolute low scores, not on goals-from-here, and is negligible).
export function liveWdl(
  ratingDiff: number,
  hg: number,
  ag: number,
  frac: number,
  cfg: { supDiv?: number; totalGoals?: number } = {},
  maxAdd = 10
): { win: number; draw: number; loss: number } {
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  const f = Math.max(0, Math.min(1, frac))
  const mh = lh * f
  const ma = la * f
  let win = 0,
    draw = 0,
    loss = 0
  for (let i = 0; i <= maxAdd; i++) {
    for (let j = 0; j <= maxAdd; j++) {
      const p = poissonPmf(mh, i) * poissonPmf(ma, j)
      const fh = hg + i,
        fa = ag + j
      if (fh > fa) win += p
      else if (fh === fa) draw += p
      else loss += p
    }
  }
  const s = win + draw + loss || 1
  return { win: win / s, draw: draw / s, loss: loss / s }
}

// Probability the first/home side ADVANCES from an in-progress KNOCKOUT match: the live regulation result,
// then (on the remaining draw mass) a fresh ~1/3-length extra time, then a coin-flip shootout. Mirrors
// koAdvanceRaw but anchored on the current score + time left.
export function liveKoAdvance(
  ratingDiff: number,
  hg: number,
  ag: number,
  frac: number,
  cfg: { supDiv?: number; totalGoals?: number; rho?: number } = {},
  noExtraTime = false // third-place play-off: level regulation -> straight to penalties
): number {
  const reg = liveWdl(ratingDiff, hg, ag, frac, cfg, 8)
  if (noExtraTime) return reg.win + reg.draw * 0.5 // straight to a coin-flip shootout
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  const rho = cfg.rho ?? POISSON_CONFIG.rho
  const et = wdlFromLambdas(lh * 0.33, la * 0.33, rho, 8) // extra time from level
  return reg.win + reg.draw * (et.win + et.draw * 0.5)
}

// In-game state for the live model (beyond the scoreline): red cards, shot/possession dominance, and the
// current goal difference (home - away) used to keep dominance orthogonal to the score.
export interface LiveInGame {
  redHome?: number
  redAway?: number
  possHome?: number
  possAway?: number // %
  shotsHome?: number
  shotsAway?: number
  sotHome?: number
  sotAway?: number // shots on target
  goalDiff?: number // home - away, current scoreline
}

// An Elo-equivalent nudge to the home rating gap from the live in-game state, bending the remaining-time
// goal rates. Calibrated against empirical data (RunRepeat 19,985-game red-card study; World Cup red-card
// study; American Soccer Analysis on shot/possession predictiveness). Two channels:
//   • Red cards — a heavy handicap, larger the more time remains (more match left to exploit the extra man),
//     with DIMINISHING RETURNS on multiple cards (a 9-man defense isn't twice as broken as a 10-man one).
//   • Shot / possession dominance — shots on target dominate the signal, off-target shots and possession add
//     little; the whole channel grows as the match is observed (1 - f) and is capped. Crucially it's kept
//     ORTHOGONAL TO THE SCORELINE: dominance that agrees with the current lead is already priced into the
//     score (damped), while a trailing side's dominance is genuine new information (kept). And dominance a
//     red card mechanically caused (the man-up side naturally out-shoots) is discounted to avoid double-count.
export function liveEloAdjustment(g: LiveInGame, frac: number): number {
  const f = Math.max(0, Math.min(1, frac))

  // Red cards: net, with concave magnitude (1st card = 1.0, each further card adds 0.6).
  const netRed = (g.redAway ?? 0) - (g.redHome ?? 0) // + favors home
  const redMag =
    Math.sign(netRed) *
    (Math.abs(netRed) <= 1
      ? Math.abs(netRed)
      : 1 + 0.6 * (Math.abs(netRed) - 1))
  const redNudge = redMag * 280 * (0.45 + 0.55 * f)

  // In-game dominance: shots on target carry the signal; off-target shots + possession add a little.
  const sotDiff = (g.sotHome ?? 0) - (g.sotAway ?? 0)
  const offTargetDiff =
    (g.shotsHome ?? 0) -
    (g.sotHome ?? 0) -
    ((g.shotsAway ?? 0) - (g.sotAway ?? 0))
  const possDiff = ((g.possHome ?? 50) - (g.possAway ?? 50)) / 100
  let dom = Math.max(
    -170,
    Math.min(170, sotDiff * 24 + offTargetDiff * 4 + possDiff * 45)
  )

  // Orthogonalize against the scoreline: a leader who is also out-playing has that edge already in the score
  // (damp), whereas a side that is behind yet dominating is mispriced by the score alone (keep full).
  const gd = g.goalDiff ?? 0
  if (gd !== 0 && dom !== 0 && Math.sign(dom) === Math.sign(gd)) dom *= 0.4
  // Discount dominance a red card already explains (the man-up side naturally out-shoots — same cause).
  if (netRed !== 0 && dom !== 0 && Math.sign(dom) === Math.sign(netRed))
    dom *= 0.5

  const domNudge = dom * (1 - f)

  // Joint bound so stacked channels can't run away (≈ a strong single red's worth).
  return Math.max(-350, Math.min(350, redNudge + domNudge))
}

// Sample the FINAL scoreline of an in-progress match for the Monte Carlo: current score + Poisson goals
// over the remaining fraction. frac=0 returns the current score unchanged (match effectively over).
export function sampleRemainingScoreline(
  ratingDiff: number,
  hg: number,
  ag: number,
  frac: number,
  rand: () => number,
  cfg = {}
): [number, number] {
  const [lh, la] = eloToLambdas(ratingDiff, cfg)
  const f = Math.max(0, Math.min(1, frac))
  return [hg + samplePoisson(lh * f, rand), ag + samplePoisson(la * f, rand)]
}

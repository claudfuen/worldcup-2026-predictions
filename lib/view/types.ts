// Single source of truth for DERIVED DISPLAY STATE. Pages render from these discriminated unions
// instead of re-deriving "clinched -> ✓ vs forecast % vs out" inline (which kept diverging per page).
// The key invariant is encoded in the type: a % lives ONLY on the `forecast` arm, so rendering a
// clinched/eliminated team as a percentage is a COMPILE ERROR, not a review catch.

export type Tone = "win" | "contention" | "muted" | "eliminated"

// Tailwind class for a Tone - mapped in ONE place.
export const TONE_CLASS: Record<Tone, string> = {
  win: "text-win",
  contention: "text-contention",
  muted: "text-muted-foreground",
  eliminated: "text-muted-2",
}

// A sim frequency that has already been forecast-capped (<=99%) and formatted. Branded so a raw
// number / uncapped string can never be passed where a forecast label is expected. forecastPct()
// is the ONLY producer (it casts internally).
export type ForecastLabel = string & { readonly __forecast: unique symbol }

// A team's Round-of-32 advancement, for standings + reach displays. The clinched/eliminated arms
// carry NO number; only `forecast` has pct + delta.
export type AdvanceDisplay =
  | { kind: "wonGroup"; symbol: "👑"; label: "✓ 1st"; tone: "win" }
  | { kind: "runnerUp"; symbol: "✓"; label: "✓ 2nd"; tone: "win" }
  | { kind: "advanced"; symbol: "✓"; label: "✓ in"; tone: "win" } // top-2 or best-third clinched
  | { kind: "eliminated"; symbol: null; label: "out"; tone: "eliminated" }
  | {
      kind: "forecast"
      symbol: null
      pct: ForecastLabel
      tone: Tone
      delta?: number
    }

export function isClinched(d: AdvanceDisplay): boolean {
  return d.kind === "wonGroup" || d.kind === "runnerUp" || d.kind === "advanced"
}

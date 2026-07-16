import { forecastPct } from "@/lib/format"

// A compact confidence meter for a NON-clinched (forecast) probability: a short bar whose fill conveys
// magnitude at a glance, next to the capped %. Used wherever the model shows a projected — not
// mathematically locked — outcome (bracket slots, the third-place chance column, match candidates), so
// odds read visually instead of as a bare number. Clinched/eliminated states use ✓/out, never this.
export function ProbMeter({
  p,
  width = 26,
  className = "",
}: {
  p: number
  width?: number
  className?: string
}) {
  const v = Math.max(0, Math.min(p, 0.99))
  // Grade the fill from muted (long shot) toward the pitch-green primary (likely), so colour reinforces width.
  const fill = `color-mix(in oklab, var(--primary) ${35 + Math.round(v * 65)}%, var(--muted-foreground))`
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="relative inline-block h-1 shrink-0 overflow-hidden rounded-full bg-muted/30"
        style={{ width }}
        aria-hidden
      >
        {v * 100 >= 2 && (
          // Floor to a visible 3px so a long shot reads as an intentional minimal mark, not a sub-pixel artifact.
          <span
            className="absolute inset-y-0 start-0 rounded-full"
            style={{ width: `${v * 100}%`, minWidth: 3, background: fill }}
          />
        )}
      </span>
      <span className="font-mono tabular-nums">{forecastPct(p)}</span>
    </span>
  )
}

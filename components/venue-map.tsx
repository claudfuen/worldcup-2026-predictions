import { geoAlbers, geoPath } from "d3-geo"
import type { GeoPermissibleObjects } from "d3-geo"
import { VENUES, type Venue } from "@/lib/data/venues"
import { NORTH_AMERICA } from "@/lib/data/northAmerica"
import { localeHref, type Locale } from "@/lib/i18n/config"

// The 16 host venues on a flat map of the three host nations (d3-geo Albers — the standard conic projection
// for North America). Each venue is a pin (sized by how many matches it holds, coloured by country) linking to
// its page, with a de-conflicted city label. One server-rendered SVG via a real projection — no client JS, no
// overlay, hydrates cleanly.

// Fit to the host-region landmass itself (NOT a lat/lng rectangle — Albers is conic, so a rectangle's wide
// tropical bottom edge would dominate the fit and shrink the venues to a dot). The viewBox is the land's
// projected bounds plus a margin so coastal pins and their labels keep room.
const NA_GEO: GeoPermissibleObjects = {
  type: "MultiPolygon",
  coordinates: NORTH_AMERICA.map((r) => [r]),
}
const projection = geoAlbers().fitSize([1000, 1000], NA_GEO)
const path = geoPath(projection)
const naD = path(NA_GEO) ?? ""
const nb = path.bounds(NA_GEO)
const PADX = (nb[1][0] - nb[0][0]) * 0.1
const PADY = (nb[1][1] - nb[0][1]) * 0.07
const VB = {
  x: nb[0][0] - PADX,
  y: nb[0][1] - PADY,
  w: nb[1][0] - nb[0][0] + 2 * PADX,
  h: nb[1][1] - nb[0][1] + 2 * PADY,
}

const FILL: Record<Venue["country"], string> = {
  USA: "var(--win)",
  Mexico: "var(--contention)",
  Canada: "var(--data-cool)",
}

const FS = 15 // label font size (viewBox units)
const overlaps = (a: Box, c: Box) =>
  !(a.x1 < c.x0 || a.x0 > c.x1 || a.y1 < c.y0 || a.y0 > c.y1)
type Box = { x0: number; y0: number; x1: number; y1: number }

export function VenueMap({
  counts,
  locale,
}: {
  counts: Record<string, number>
  locale: Locale
}) {
  const max = Math.max(1, ...VENUES.map((v) => counts[v.slug] ?? 0))
  const pts = VENUES.map((v) => {
    const xy = projection([v.lng, v.lat])
    if (!xy) return null
    const n = counts[v.slug] ?? 0
    return {
      v,
      x: xy[0],
      y: xy[1],
      n,
      r: 5 + (n / max) * 5,
      side: null as "left" | "right" | null,
    }
  }).filter((p): p is NonNullable<typeof p> => p !== null)

  // Greedy label de-confliction: place labels for the busiest venues first, preferring the right side, and
  // skip any that would collide with an already-placed label or another pin — so labels never overlap. A
  // venue without room keeps its pin (hover title + the list below carry its name).
  const pinBoxes: Box[] = pts.map((p) => ({
    x0: p.x - p.r,
    y0: p.y - p.r,
    x1: p.x + p.r,
    y1: p.y + p.r,
  }))
  const placed: Box[] = []
  const fitsFrame = (box: Box) =>
    box.x0 >= VB.x + 2 &&
    box.x1 <= VB.x + VB.w - 2 &&
    box.y0 >= VB.y + 2 &&
    box.y1 <= VB.y + VB.h - 2
  for (const p of [...pts].sort((a, b) => b.n - a.n || a.x - b.x)) {
    const tw = p.v.city.length * FS * 0.5 + 4
    const half = FS * 0.62
    const right: Box = {
      x0: p.x + p.r + 6,
      y0: p.y - half,
      x1: p.x + p.r + 6 + tw,
      y1: p.y + half,
    }
    const left: Box = {
      x0: p.x - p.r - 6 - tw,
      y0: p.y - half,
      x1: p.x - p.r - 6,
      y1: p.y + half,
    }
    for (const [side, box] of [
      ["right", right],
      ["left", left],
    ] as const) {
      if (!fitsFrame(box)) continue
      if (
        placed.some((q) => overlaps(q, box)) ||
        pinBoxes.some((q) => overlaps(q, box))
      )
        continue
      p.side = side
      placed.push(box)
      break
    }
  }

  // paint north-to-south so southern pins/labels sit on top where the map is densest
  const ordered = [...pts].sort((a, b) => a.y - b.y)

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card dark:inset-ring dark:inset-ring-white/5">
      <svg
        viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Map of the 16 host venues across the United States, Mexico and Canada"
      >
        <path
          d={naD}
          fill="var(--muted-foreground)"
          fillOpacity={0.12}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.28}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        {ordered.map((p) => {
          const labelLeft = p.side === "left"
          return (
            <a
              key={p.v.slug}
              href={localeHref(locale, `/venues/${p.v.slug}`)}
              className="group"
              aria-label={`${p.v.fifaName}, ${p.v.city}`}
            >
              <title>{`${p.v.fifaName} · ${p.v.city}`}</title>
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r + 3}
                fill="var(--card)"
                fillOpacity={0.85}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={FILL[p.v.country]}
                stroke="var(--card)"
                strokeWidth={1.5}
                className="group-hover:brightness-110"
              />
              {p.side && (
                <text
                  x={labelLeft ? p.x - p.r - 6 : p.x + p.r + 6}
                  y={p.y}
                  textAnchor={labelLeft ? "end" : "start"}
                  dominantBaseline="central"
                  className="fill-foreground stroke-card group-hover:fill-primary"
                  style={{
                    fontSize: FS,
                    fontWeight: 600,
                    paintOrder: "stroke",
                    strokeWidth: 4,
                  }}
                >
                  {p.v.city}
                </text>
              )}
            </a>
          )
        })}
      </svg>
    </div>
  )
}

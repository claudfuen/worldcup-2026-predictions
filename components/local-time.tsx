"use client"

import { useViewerZone } from "@/lib/useViewerZone"
import {
  fmtDateTime,
  fmtTime,
  fmtTimeShort,
  fmtDay,
  relativeDay,
} from "@/lib/format"
import { useT } from "@/lib/i18n/provider"

// Renders a single UTC instant in the viewer's local TIME but the SITE's LANGUAGE (useViewerZone supplies
// the site locale for formatting + the viewer's timezone). Shows ET until the client resolves the zone.
// `timeshort` omits the zone suffix (for dense cards where it would otherwise force an awkward wrap).
export function LocalTime({
  utc,
  mode = "datetime",
}: {
  utc: string
  mode?: "datetime" | "time" | "timeshort" | "day"
}) {
  const { zone } = useViewerZone()
  const fn =
    mode === "time"
      ? fmtTime
      : mode === "timeshort"
        ? fmtTimeShort
        : mode === "day"
          ? fmtDay
          : fmtDateTime
  return <span suppressHydrationWarning>{fn(utc, zone)}</span>
}

// A friendly relative DAY for an instant — "Today" / "Tonight" / "Tomorrow" / "Yesterday", a localized weekday
// this week, else month + day (see lib/format relativeDay, incl. the 5 AM night rollover). Computed against the
// viewer's now + zone, so it self-corrects after mount; suppressHydrationWarning covers the SSR→client swap.
export function RelativeDay({ utc }: { utc: string }) {
  const { zone } = useViewerZone()
  const t = useT()
  const rel = relativeDay(utc, zone, new Date().toISOString())
  return (
    <span suppressHydrationWarning>
      {rel.key ? t(`time.${rel.key}`) : rel.text}
    </span>
  )
}

"use client";

import { useViewerZone } from "@/lib/useViewerZone";
import { fmtDateTime, fmtTime, fmtTimeShort, fmtDay } from "@/lib/format";

// Renders a single UTC instant in the viewer's local TIME but the SITE's LANGUAGE (useViewerZone supplies
// the site locale for formatting + the viewer's timezone). Shows ET until the client resolves the zone.
// `timeshort` omits the zone suffix (for dense cards where it would otherwise force an awkward wrap).
export function LocalTime({ utc, mode = "datetime" }: { utc: string; mode?: "datetime" | "time" | "timeshort" | "day" }) {
  const { zone } = useViewerZone();
  const fn = mode === "time" ? fmtTime : mode === "timeshort" ? fmtTimeShort : mode === "day" ? fmtDay : fmtDateTime;
  return <span suppressHydrationWarning>{fn(utc, zone)}</span>;
}

"use client";

import { useViewerZone } from "@/lib/useViewerZone";
import { fmtDateTime, fmtTime, fmtDay } from "@/lib/format";

// Renders a single UTC instant in the viewer's local time. Server-rendered pages can drop this
// in place of a formatted string; it shows ET until the client resolves the real zone.
export function LocalTime({ utc, mode = "datetime" }: { utc: string; mode?: "datetime" | "time" | "day" }) {
  const { zone } = useViewerZone();
  const fn = mode === "time" ? fmtTime : mode === "day" ? fmtDay : fmtDateTime;
  return <span suppressHydrationWarning>{fn(utc, zone)}</span>;
}

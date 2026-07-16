"use client"

import { useT } from "@/lib/i18n/provider"

// A small "hot match" marker shown wherever a match is listed (schedule, today rail, team page, match
// page). "Hot" = the match is among the current watch-plan picks (see lib/watchability.ts). Amber, no
// emoji — reads as "notable/worth watching" without competing with the red live state.
export function HotBadge({
  reason,
  className = "",
}: {
  reason?: string
  className?: string
}) {
  const t = useT()
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-contention/30 bg-contention/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wide text-contention uppercase ${className}`}
      title={
        reason
          ? t("home.worthWatchingReason", { reason })
          : t("home.worthWatching")
      }
    >
      <span
        className="size-1 shrink-0 rounded-full bg-contention"
        aria-hidden
      />
      {t("home.hot")}
      {reason ? (
        <span className="hidden font-medium text-contention/85 normal-case sm:inline">
          {" "}
          · {reason}
        </span>
      ) : null}
    </span>
  )
}

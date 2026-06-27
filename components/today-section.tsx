"use client";

import Link from "next/link";
import { Flag } from "@/components/flag";
import { useViewerZone } from "@/lib/useViewerZone";
import { fmtTime, fmtDayKey } from "@/lib/format";
import type { MatchInfo } from "@/lib/predictions";

const ROUND_SHORT: Record<string, string> = { GROUP: "", R32: "R32", R16: "R16", QF: "QF", SF: "SF", "3P": "3rd", FINAL: "Final" };

// "Today's" matches in the viewer's local day, with local kickoff times. Client-side so the
// day boundary follows the viewer's timezone, not the host region.
export function TodaySection({ matches }: { matches: MatchInfo[] }) {
  const { zone, ready } = useViewerZone();
  // The whole point of this block is the viewer's local day, so don't paint an ET-day guess on the
  // server and swap it after mount. Render nothing until the zone resolves, then the first painted set
  // is already correct (and immune to the near-midnight hydration mismatch).
  if (!ready) return null;
  const nowIso = new Date().toISOString();
  const today = fmtDayKey(nowIso, zone);
  // A one-day look-back so yesterday's results (and just-finished late games) are still here when you check
  // in — they don't disappear the instant the local day rolls over.
  const yesterday = fmtDayKey(new Date(Date.parse(nowIso) - 86400000).toISOString(), zone);
  const recent = matches
    .filter((m) => { const d = fmtDayKey(m.utc, zone); return d === today || d === yesterday; })
    .sort((a, b) => a.utc.localeCompare(b.utc));
  if (recent.length === 0) return null;
  return (
    <section className="mt-8" suppressHydrationWarning>
      <h2 className="text-muted-foreground mb-3 font-mono text-xs font-semibold tracking-wide uppercase">Latest &amp; today</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((m) => <TodayTile key={m.match} m={m} today={today} />)}
      </div>
    </section>
  );
}

function TodayTile({ m, today }: { m: MatchInfo; today?: string }) {
  const { zone } = useViewerZone();
  const isYesterday = !!today && fmtDayKey(m.utc, zone) !== today;
  const final = m.status === "final";
  const live = m.status === "live";
  const showScore = final || live;
  const homeCode = m.home ?? m.projHome?.[0]?.code ?? null;
  const awayCode = m.away ?? m.projAway?.[0]?.code ?? null;
  const homeName = m.homeName ?? m.projHome?.[0]?.name ?? m.slotHome ?? "TBD";
  const awayName = m.awayName ?? m.projAway?.[0]?.name ?? m.slotAway ?? "TBD";
  return (
    <Link href={`/match/${m.match}`} className={`bg-card hover:border-primary/50 hover:bg-surface-raised block rounded-2xl border p-4 transition-colors ${live ? "border-live/40" : "border-border"}`}>
      <div className="text-muted-foreground mb-2 flex items-center justify-between text-[11px]">
        <span className="font-mono" suppressHydrationWarning>{isYesterday && <span className="text-muted-2">Yesterday · </span>}{fmtTime(m.utc, zone)}</span>
        <span>
          {live ? (
            <span className="inline-flex items-center gap-1 font-semibold text-live"><span className="size-1.5 animate-pulse rounded-full bg-live" />LIVE {m.liveDetail}</span>
          ) : final ? (
            <span className="text-win">FT</span>
          ) : (
            m.group ? `Group ${m.group}` : ROUND_SHORT[m.round]
          )}
        </span>
      </div>
      <Row code={homeCode} name={homeName} score={showScore ? m.homeScore : undefined} win={final && (m.homeScore ?? 0) > (m.awayScore ?? 0)} projected={!m.home && m.round !== "GROUP"} />
      <Row code={awayCode} name={awayName} score={showScore ? m.awayScore : undefined} win={final && (m.awayScore ?? 0) > (m.homeScore ?? 0)} projected={!m.away && m.round !== "GROUP"} />
    </Link>
  );
}

function Row({ code, name, score, win, projected }: { code: string | null; name: string; score?: number; win?: boolean; projected?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Flag code={code} size={18} />
      <span className={`min-w-0 flex-1 truncate text-sm ${win ? "font-semibold" : projected ? "text-foreground/70" : ""}`}>{name}</span>
      {score != null && <span className={`shrink-0 font-mono text-sm tabular-nums ${win ? "font-bold" : "text-muted-foreground"}`}>{score}</span>}
    </div>
  );
}

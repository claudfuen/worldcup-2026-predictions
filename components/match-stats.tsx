"use client";
import { useT } from "@/lib/i18n/provider";
import type { MatchStats as MatchStatsData } from "@/lib/matchEvents";

// Head-to-head match stats (possession, shots, on-target, corners, fouls) as proportional bars — home in
// pitch-green from the left, away in cool-blue from the right, matching the win-probability bar's voices.
// Shown for live + completed matches; renders nothing when ESPN has no boxscore yet. Client so it can live
// inside the polled match islands (stats refresh in place as SWR re-fetches the live boxscore).
export function MatchStats({ stats }: { stats: MatchStatsData | null }) {
  const t = useT();
  if (!stats) return null;
  const rows: { label: string; h: number | null; a: number | null; pctSuffix?: boolean }[] = [
    { label: t("match.statPossession"), h: stats.home.possession, a: stats.away.possession, pctSuffix: true },
    { label: t("match.statShots"), h: stats.home.shots, a: stats.away.shots },
    { label: t("match.statShotsOnTarget"), h: stats.home.shotsOnTarget, a: stats.away.shotsOnTarget },
    { label: t("match.statCorners"), h: stats.home.corners, a: stats.away.corners },
    { label: t("match.statFouls"), h: stats.home.fouls, a: stats.away.fouls },
  ].filter((r) => r.h != null || r.a != null);
  if (!rows.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-muted-foreground mb-3 font-mono text-xs font-semibold tracking-[0.1em] uppercase">{t("match.matchStats")}</h2>
      <div className="border-border bg-card space-y-3.5 rounded-2xl border p-4 dark:inset-ring dark:inset-ring-white/5">
        {rows.map((r) => <StatRow key={r.label} {...r} />)}
      </div>
    </section>
  );
}

function StatRow({ label, h, a, pctSuffix }: { label: string; h: number | null; a: number | null; pctSuffix?: boolean }) {
  const hv = h ?? 0;
  const av = a ?? 0;
  const total = hv + av;
  // Possession is already a percentage; counts are normalized to their share of the pair.
  const hShare = pctSuffix ? hv : total > 0 ? (hv / total) * 100 : 50;
  const fmt = (v: number | null) => (v == null ? "–" : pctSuffix ? `${Math.round(v)}%` : `${v}`);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-foreground w-10 font-mono font-semibold tabular-nums">{fmt(h)}</span>
        <span className="text-muted-2 truncate text-[10px] font-semibold tracking-wide uppercase">{label}</span>
        <span className="text-foreground w-10 text-right font-mono font-semibold tabular-nums">{fmt(a)}</span>
      </div>
      <div className="bg-muted/40 flex h-1.5 overflow-hidden rounded-full dark:inset-ring dark:inset-ring-white/5">
        <div className="bg-primary/80" style={{ width: `${hShare}%` }} />
        <div className="bg-data-cool/70" style={{ width: `${100 - hShare}%` }} />
      </div>
    </div>
  );
}

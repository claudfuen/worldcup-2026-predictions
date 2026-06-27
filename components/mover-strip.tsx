import Link from "next/link";
import { forecastPct } from "@/lib/format";
import { teamSlug } from "@/lib/slug";
import type { TeamPrediction } from "@/lib/predictions";

// The "what moved today" half of the headline, as one typographic line (not prose) — the daily delta that
// keeps the call feeling live. Renders nothing on a flat day rather than an empty "no movement".
export function MoverStrip({ teams }: { teams: TeamPrediction[] }) {
  const mover = [...teams]
    .filter((t) => t.titleDelta != null && Math.abs(t.titleDelta) >= 0.01)
    .sort((a, b) => Math.abs(b.titleDelta!) - Math.abs(a.titleDelta!))[0];
  if (!mover) return null;
  const up = (mover.titleDelta ?? 0) > 0;
  return (
    <div className="border-border/60 text-muted-foreground mt-4 border-t pt-3 text-sm">
      Biggest move today:{" "}
      <Link href={`/team/${teamSlug(mover.name)}`} className="text-foreground font-medium hover:underline">{mover.name}</Link>{" "}
      <span className={up ? "text-win" : "text-destructive"}>
        {up ? "▲" : "▼"}{Math.abs(Math.round((mover.titleDelta ?? 0) * 100))}
      </span>{" "}
      to {forecastPct(mover.title)}.
    </div>
  );
}

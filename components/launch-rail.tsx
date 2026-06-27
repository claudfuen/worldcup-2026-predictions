import Link from "next/link";
import { ShareBar } from "@/components/share-bar";
import { forecastPct } from "@/lib/format";
import type { TeamPrediction } from "@/lib/predictions";

// J4 catch-all, demoted from a card grid to one quiet hairline row, plus share + trust/footer copy.
const LINKS = [
  { label: "Groups", href: "/groups" },
  { label: "Bracket", href: "/bracket" },
  { label: "Schedule", href: "/schedule" },
  { label: "My Matches", href: "/matches" },
  { label: "Methodology", href: "/methodology" },
];

export function LaunchRail({ teams, iterations, className = "" }: { teams: TeamPrediction[]; iterations: number; className?: string }) {
  const c1 = teams[0];
  return (
    <footer className={`border-border/60 border-t pt-6 ${className}`}>
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs font-medium tracking-wide uppercase">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">{l.label}</Link>
        ))}
      </nav>
      {c1 && (
        <div className="mt-4">
          <ShareBar text={`${c1.name} are the ${forecastPct(c1.title)} favorite to win the World Cup 2026, per ${iterations.toLocaleString()} Monte Carlo sims.`} path="/" />
        </div>
      )}
      <p className="text-muted-2 mt-5 text-xs text-pretty">
        Elo + Poisson scoreline model with rating uncertainty, host advantage and an extra-time/penalty knockout
        model · 2026 head-to-head-first tiebreakers · verified 495-row third-place table. <Link href="/methodology" className="text-primary">How it works →</Link>
      </p>
      <p className="text-muted-2 mt-1 text-xs">Live data via ESPN · not affiliated with FIFA.</p>
    </footer>
  );
}

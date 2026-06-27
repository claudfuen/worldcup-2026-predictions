import { Fragment } from "react";
import { LocalTime } from "@/components/local-time";
import type { MatchInfo } from "@/lib/predictions";

// A glance at where the whole tournament is: a phase tracker (Group → R32 → … → Final) with the current
// stage lit, plus a one-line context (matchday / round progress / what's next). Gives the homepage its
// "snapshot of the entire tournament" without a chart.
const PHASES = [
  { key: "GROUP", label: "Group", full: "Group stage", total: 16 },
  { key: "R32", label: "R32", full: "Round of 32", total: 16 },
  { key: "R16", label: "R16", full: "Round of 16", total: 8 },
  { key: "QF", label: "QF", full: "Quarter-finals", total: 4 },
  { key: "SF", label: "SF", full: "Semi-finals", total: 2 },
  { key: "FINAL", label: "Final", full: "Final", total: 1 },
] as const;

export function TournamentStage({
  matches, matchesPlayed, totalGroupMatches, className = "",
}: { matches: MatchInfo[]; matchesPlayed: number; totalGroupMatches: number; className?: string }) {
  const playedIn = (round: string) => matches.filter((m) => m.round === round && m.status === "final").length;
  const phases = PHASES.map((p) => {
    const total = p.key === "GROUP" ? totalGroupMatches : p.total;
    const played = p.key === "GROUP" ? matchesPlayed : playedIn(p.key);
    return { ...p, total, played, done: played >= total };
  });
  const firstUndone = phases.findIndex((p) => !p.done);
  const cur = firstUndone === -1 ? phases.length - 1 : firstUndone;
  const curPhase = phases[cur];

  let context: React.ReactNode;
  if (curPhase.key === "GROUP") {
    const matchday = Math.min(3, Math.max(1, Math.ceil(matchesPlayed / 24))); // 24 group matches per matchday
    const firstR32 = matches.filter((m) => m.round === "R32").sort((a, b) => a.utc.localeCompare(b.utc))[0];
    context = (
      <>Group stage · Matchday {matchday} · {matchesPlayed}/{totalGroupMatches} matches played{firstR32 && <> · Knockouts begin <LocalTime utc={firstR32.utc} mode="day" /></>}</>
    );
  } else {
    const next = matches.filter((m) => m.round === curPhase.key && m.status !== "final").sort((a, b) => a.utc.localeCompare(b.utc))[0];
    context = (
      <>{curPhase.full} · {curPhase.played}/{curPhase.total} played{next && <> · Next <LocalTime utc={next.utc} mode="day" /></>}</>
    );
  }

  return (
    <div className={`border-border bg-card rounded-2xl border px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        {phases.map((p, i) => (
          <Fragment key={p.key}>
            <span className={`font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase ${i === cur ? "text-primary" : p.done ? "text-muted-foreground" : "text-muted-2"}`}>
              {p.label}
            </span>
            {i < phases.length - 1 && <span className={`h-px w-5 shrink-0 ${p.done ? "bg-primary/40" : "bg-border"}`} />}
          </Fragment>
        ))}
      </div>
      <p className="text-muted-2 mt-2 text-xs" suppressHydrationWarning>{context}</p>
    </div>
  );
}

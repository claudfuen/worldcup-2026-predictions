import { Fragment } from "react";
import Link from "next/link";
import type { MatchInfo } from "@/lib/predictions";
import { Flag } from "./flag";
import { pct, etDay } from "@/lib/format";

// Column orderings chosen so each match's two feeders are vertically adjacent (top half, then bottom half).
const ORDER: Record<string, number[]> = {
  R32: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
  R16: [89, 90, 93, 94, 91, 92, 95, 96],
  QF: [97, 98, 99, 100],
  SF: [101, 102],
  FINAL: [104],
};
const ROUNDS = ["R32", "R16", "QF", "SF", "FINAL"] as const;
const ROUND_LABEL: Record<string, string> = { R32: "Round of 32", R16: "Round of 16", QF: "Quarter-finals", SF: "Semi-finals", FINAL: "Final" };

export function Bracket({
  matches,
  myMatchNumbers = [],
  highlightCode,
}: {
  matches: MatchInfo[];
  myMatchNumbers?: number[];
  highlightCode?: string;
}) {
  const byMatch = new Map(matches.map((m) => [m.match, m]));
  const tickets = new Set(myMatchNumbers);
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-[1140px] items-stretch">
        {ROUNDS.map((round, ri) => (
          <Fragment key={round}>
            <div className="flex min-w-[176px] flex-1 flex-col">
              <div className="text-muted-foreground mb-3 h-4 px-1 text-[10px] font-semibold font-mono tracking-wide uppercase">
                {ROUND_LABEL[round]}
              </div>
              <div className="flex flex-1 flex-col">
                {ORDER[round].map((mn) => {
                  const m = byMatch.get(mn);
                  return (
                    <div key={mn} className="flex flex-1 items-center">
                      {m && <Node m={m} hasTicket={tickets.has(mn)} highlightCode={highlightCode} />}
                    </div>
                  );
                })}
              </div>
            </div>
            {ri < ROUNDS.length - 1 && <Connectors count={ORDER[ROUNDS[ri + 1]].length} />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// A column of "⊐" brackets, one per next-round match. With uniform node heights, each
// bracket's top/bottom edges land exactly on its two feeders' centers and its right edge
// meets the target node — turning the columns into a connected tree.
function Connectors({ count }: { count: number }) {
  return (
    <div className="flex w-4 shrink-0 flex-col">
      <div className="mb-3 h-4" />
      <div className="flex flex-1 flex-col">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className="border-muted-foreground/30 h-1/2 w-full rounded-r-md border-t border-r border-b" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Node({ m, hasTicket, highlightCode }: { m: MatchInfo; hasTicket: boolean; highlightCode?: string }) {
  const hi =
    highlightCode &&
    [m.home, m.away, m.projHome?.[0]?.code, m.projAway?.[0]?.code].includes(highlightCode);
  return (
    <Link
      href={`/match/${m.match}`}
      className={`bg-card hover:bg-muted/30 block w-full rounded-lg border text-xs ${
        hi ? "border-primary/60 ring-primary/20 ring-1" : hasTicket ? "border-amber-500/50" : "border-border"
      }`}
    >
      <div className="text-muted-foreground flex items-center justify-between gap-1 px-2 pt-1 text-[9px]">
        <span className="truncate">M{m.match} · {etDay(m.utc)} · {m.city}</span>
        {hasTicket && <span title="You have tickets" className="shrink-0">🎟️</span>}
      </div>
      <Side m={m} side="home" highlightCode={highlightCode} />
      <div className="border-border/40 border-t" />
      <Side m={m} side="away" highlightCode={highlightCode} />
    </Link>
  );
}

function Side({ m, side, highlightCode }: { m: MatchInfo; side: "home" | "away"; highlightCode?: string }) {
  const resolved = side === "home" ? m.home : m.away;
  const name = side === "home" ? m.homeName : m.awayName;
  const proj = (side === "home" ? m.projHome : m.projAway)?.[0];
  const code = resolved ?? proj?.code ?? null;
  const label = name ?? proj?.name ?? "TBD";
  const prob = resolved ? null : proj?.prob;
  const isHi = highlightCode && code === highlightCode;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isHi ? "bg-primary/10" : ""}`}>
      <Flag code={code} size={18} />
      <span className={`min-w-0 flex-1 truncate ${resolved ? "font-semibold" : "text-foreground/80"}`}>{label}</span>
      {resolved ? (
        <span className="shrink-0 text-[10px] font-bold text-emerald-400" title="Confirmed">✓</span>
      ) : (
        prob != null && <span className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums">{pct(Math.min(prob, 0.99))}</span>
      )}
    </div>
  );
}

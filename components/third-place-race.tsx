"use client";

import Link from "next/link";
import type { ThirdPlaceEntry } from "@/lib/predictions";
import { Flag } from "@/components/flag";
import { teamSlug } from "@/lib/slug";
import { forecastPct } from "@/lib/format";
import { ProbMeter } from "@/components/prob-meter";
import { useHoverTip, HoverTipPanel } from "@/components/hover-tip";

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

// What still has to happen for a not-yet-settled third, computed from the full 12-row race. Six-or-fewer
// teams are mathematically locked above it (the DECIDED groups' thirds that outrank it); every still-playing
// group is a swing that could finish above OR below it. It reaches the top 8 iff at most 7 thirds end above
// it — i.e. at least `needBelow` of the swing groups must finish with a weaker 3rd. The likeliest of those
// swings (by advance %) are the hardest to clear.
function survival(e: ThirdPlaceEntry, all: ThirdPlaceEntry[]) {
  const above = (x: ThirdPlaceEntry) => (x.pts !== e.pts ? x.pts > e.pts : x.gd !== e.gd ? x.gd > e.gd : x.gf > e.gf);
  const others = all.filter((x) => x.code !== e.code);
  const lockedAbove = others.filter((x) => x.decided && above(x)).length;
  const swing = others.filter((x) => !x.decided);
  const needBelow = swing.length - (7 - lockedAbove);
  const dangers = [...swing].sort((a, b) => b.advanceProb - a.advanceProb).slice(0, 2).map((x) => `${x.name} ${forecastPct(x.advanceProb)}`);
  return { needBelow, swingCount: swing.length, letters: swing.map((x) => x.group).sort().join("/"), dangers };
}

// One row's hover detail: what (if anything) would still change the team's Round-of-32 fate, plus the
// model's top-3 likely opponents (probability conditional on the team actually advancing).
function RowTip({ e, all }: { e: ThirdPlaceEntry; all: ThirdPlaceEntry[] }) {
  const through = e.status === "won_group" || e.status === "second" || e.status === "advanced";
  const matchLine = e.match ? `Match ${e.match}${e.city ? ` · ${e.city}` : ""}` : undefined;

  let headline: string;
  if (e.status === "eliminated") {
    headline = "Eliminated — can't reach the Round of 32.";
  } else if (through && e.opponent) {
    headline = `R32 match locked: vs ${e.opponent.name}${matchLine ? ` · ${matchLine}` : ""}. This can no longer change.`;
  } else if (through && e.slotLocked) {
    headline = `Through. Plays ${matchLine ?? "the R32"} vs the Group ${e.facesGroup} winner — decided once Group ${e.facesGroup} finishes.`;
  } else if (through) {
    headline = "Through to the R32 — but the bracket slot isn't fixed yet: it depends on which other groups' thirds qualify.";
  } else {
    const s = survival(e, all);
    const frac = s.needBelow >= s.swingCount ? `all ${s.swingCount}` : `≥${s.needBelow} of the ${s.swingCount}`;
    if (s.needBelow <= 0) {
      headline = `${ordinal(e.rank)} now (${forecastPct(e.advanceProb)}) — but mathematically safe: no run of remaining results can knock it out.`;
    } else if (e.advancing) {
      headline = `Holding ${ordinal(e.rank)} (${forecastPct(e.advanceProb)}). Stays in unless overtaken — needs ${frac} still-playing groups (${s.letters}) to finish with a weaker 3rd.`;
    } else {
      headline = `${ordinal(e.rank)} now, below the cut (${forecastPct(e.advanceProb)}). Climbs in only if ${frac} still-playing groups (${s.letters}) finish with a 3rd weaker than this one${s.dangers.length ? ` — toughest to clear: ${s.dangers.join(", ")}` : ""}.`;
    }
  }

  // Likely opponents are the group winners this third would face. Redundant when the opponent is already
  // locked, and meaningless once eliminated, so show only otherwise.
  const showOpps = e.status !== "eliminated" && !e.opponent && (e.opponents?.length ?? 0) > 0;

  return (
    <>
      <p className="text-foreground/90 leading-snug">{headline}</p>
      {showOpps && (
        <div className="mt-2.5">
          <div className="text-muted-2 mb-1 font-mono text-[9px] font-semibold tracking-wide uppercase">
            Likely R32 opponent
          </div>
          <ul className="space-y-1">
            {e.opponents!.map((o) => (
              <li key={o.code} className="flex items-center gap-1.5">
                <Flag code={o.code} size={15} />
                <span className="text-foreground/80 min-w-0 flex-1 truncate">{o.name}</span>
                <span className="text-muted-foreground shrink-0 font-mono tabular-nums">{forecastPct(o.prob)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Row({ e, all }: { e: ThirdPlaceEntry; all: ThirdPlaceEntry[] }) {
  const tip = useHoverTip();
  const elim = e.status === "eliminated";
  const through = e.status === "won_group" || e.status === "second" || e.status === "advanced";
  const decided = through && !!e.opponent; // full match locked
  return (
    <tr
      {...tip.triggerProps}
      {...tip.tapProps}
      className={`cursor-help border-l-2 ${e.advancing ? "border-l-contention" : "border-l-transparent"} ${e.rank === 8 ? "border-b-primary/50 border-b border-dashed" : ""} ${elim ? "opacity-45" : ""} hover:bg-muted/20`}
    >
      <td className="text-muted-foreground py-2 pr-1 pl-3 font-mono text-[11px]">{e.rank}</td>
      <td className="py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/team/${teamSlug(e.name)}`} className="flex min-w-0 items-center gap-2 hover:underline">
            <Flag code={e.code} size={20} />
            <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${elim ? "line-through" : ""}`}>{e.name}</span>
          </Link>
          <Link href={`/group/${e.group.toLowerCase()}`} className="text-muted-foreground hover:text-primary shrink-0 text-[11px] hover:underline">Grp {e.group}</Link>
        </div>
      </td>
      <td className="text-muted-foreground px-1 text-center font-mono text-xs tabular-nums">{e.gf}</td>
      <td className="px-1 text-center font-mono text-xs tabular-nums">{e.gd >= 0 ? "+" : ""}{e.gd}</td>
      <td className="px-1 text-center font-mono text-[13px] font-bold tabular-nums">{e.pts}</td>
      <td className="px-2 pr-3 text-right text-xs tabular-nums">
        {through ? (
          <span className="text-win font-semibold" title={decided ? "Round-of-32 match decided" : "Clinched a Round-of-32 place"}>
            {decided ? "✓ set" : "✓ in"}
          </span>
        ) : elim ? (
          <span className="text-muted-2">out</span>
        ) : (
          <ProbMeter p={e.advanceProb} className={`justify-end ${e.advancing ? "text-contention" : "text-muted-foreground"}`} />
        )}
      </td>
      {tip.open && <HoverTipPanel pos={tip.pos}><RowTip e={e} all={all} /></HoverTipPanel>}
    </tr>
  );
}

export function ThirdPlaceRace({ entries }: { entries: ThirdPlaceEntry[] }) {
  if (!entries.length) return null;
  return (
    <section className="mt-10">
      <h2 className="text-base font-semibold tracking-tight">Third-place race</h2>
      <p className="text-muted-foreground mt-1 mb-3 text-sm">
        The <span className="text-foreground">8 best</span>{" "}of the 12 third-placed teams also reach the Round of 32.
        Rows are ordered by the current standings (points → goal difference → goals scored), but the{" "}
        <span className="text-foreground">Chance</span> column is the model&apos;s forecast — and with games still to
        play it can disagree with today&apos;s order: a team below the line can be likelier to go through than one above
        it, because the still-undecided groups&apos; thirds will gain points.
      </p>
      <div className="border-border bg-card overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border/60 border-b text-[10px] tracking-wide">
              <th className="py-2 pr-1 pl-3 text-left font-medium">#</th>
              <th className="py-2 text-left font-medium">Third-placed team</th>
              <th className="w-8 px-1 text-center font-medium">GF</th>
              <th className="w-8 px-1 text-center font-medium">GD</th>
              <th className="w-8 px-1 text-center font-semibold">Pts</th>
              <th className="px-2 pr-3 text-right font-medium" title="Model probability of reaching the Round of 32">Chance</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => <Row key={e.code} e={e} all={entries} />)}
          </tbody>
        </table>
      </div>
      <p className="text-muted-2 mt-2 text-xs">
        Order is the current standings snapshot; <span className="text-foreground/80">Chance</span> is the Monte Carlo
        probability of reaching the Round of 32 (a <span className="text-win">✓</span> is mathematically locked). Hover
        a row for what would still change and the likely opponents. The slot assignment updates as the qualifying set
        of groups changes (495 possible combinations).
      </p>
    </section>
  );
}

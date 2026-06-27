import Link from "next/link";
import { Flag } from "@/components/flag";
import { forecastPct } from "@/lib/format";
import { teamSlug } from "@/lib/slug";
import type { TeamPrediction } from "@/lib/predictions";

// The masthead: the model's single pick to win it all, stated as a confident editorial CALL (never
// definitive — it's a forecast). The hierarchy fix — the most-important insight is the largest thing on the
// page. Guards the near-flat title race with a "too close to call" top-3 variant so it never overstates.
export function MastheadVerdict({ teams, iterations }: { teams: TeamPrediction[]; iterations: number }) {
  const [c1, c2] = teams;
  if (!c1) return null;
  const close = c2 != null && c1.title - c2.title < 0.02;
  const top = [teams[0], teams[1], teams[2]].filter((t): t is TeamPrediction => Boolean(t));

  return (
    <div>
      <div className="text-primary font-mono text-xs font-semibold tracking-wide uppercase">The model&apos;s call</div>
      {close ? (
        <>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Too close to call.</h1>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg">
            {top.map((t, i) => (
              <span key={t.code} className="inline-flex items-baseline gap-1.5">
                <Link href={`/team/${teamSlug(t.name)}`} className={`hover:underline ${i === 0 ? "font-semibold" : ""}`}>{t.name}</Link>
                <span className={`font-mono text-base tabular-nums ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{forecastPct(t.title)}</span>
              </span>
            ))}
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            <Link href={`/team/${teamSlug(c1.name)}`} className="decoration-primary/40 underline-offset-4 hover:underline">{c1.name}</Link>{" "}
            <span className="text-muted-foreground font-normal">to win it all.</span>
          </h1>
          <div className="mt-3 flex items-center gap-2.5">
            <Flag code={c1.code} size={22} />
            <span className="text-primary font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{forecastPct(c1.title)}</span>
            <span className="text-muted-foreground text-sm">to lift the trophy</span>
          </div>
        </>
      )}
      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        {iterations.toLocaleString()} Monte Carlo simulations, replayed live from real results.
      </p>
    </div>
  );
}

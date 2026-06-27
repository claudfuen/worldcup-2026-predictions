import { Flag } from "@/components/flag";
import { getT } from "@/lib/i18n/server";
import type { MatchEvent } from "@/lib/matchEvents";

// The match's goals + cards as a single chronological timeline. Every row carries the team's FLAG (so the
// side is unambiguous — no reliance on a left/right split that breaks on lopsided matches), a goal/card
// marker, the player (+ assist), and for goals the RUNNING SCORE it produced. Shown for live and completed
// matches; renders nothing when there are no events.
export async function MatchTimeline({
  events, homeCode, awayCode,
}: {
  events: MatchEvent[];
  homeCode: string;
  awayCode: string;
}) {
  const t = await getT();
  if (!events.length) return null;

  // Walk the events in order to compute the running score after each goal (own goals count for the opponent).
  let h = 0, a = 0;
  const rows = events.map((e) => {
    const beneficiary = e.kind === "goal" && e.goalType === "own" ? (e.teamCode === homeCode ? awayCode : homeCode) : e.teamCode;
    let score: string | null = null;
    if (e.kind === "goal") {
      if (beneficiary === homeCode) h++;
      else if (beneficiary === awayCode) a++;
      score = `${h}–${a}`;
    }
    return { e, score, flagCode: beneficiary };
  });

  return (
    <section className="mt-8">
      <h2 className="text-muted-foreground mb-3 font-mono text-xs font-semibold tracking-[0.1em] uppercase">{t("match.timeline")}</h2>
      <ol className="border-border bg-card divide-border/40 divide-y rounded-2xl border px-3 dark:inset-ring dark:inset-ring-white/5 sm:px-4">
        {rows.map(({ e, score, flagCode }, i) => {
          const tag = e.goalType === "penalty" ? t("match.penaltyTag") : e.goalType === "own" ? t("match.ownGoalTag") : null;
          return (
            <li key={i} className="flex items-center gap-3 py-2.5">
              <span className="text-muted-2 w-12 shrink-0 font-mono text-[11px] whitespace-nowrap tabular-nums">{e.minute}</span>
              <Flag code={flagCode} size={18} />
              {e.kind === "goal" ? (
                <span className="bg-primary size-2 shrink-0 rounded-full" role="img" aria-label="Goal" />
              ) : (
                <span
                  className={`h-3.5 w-2.5 shrink-0 rounded-[2px] ${e.card === "red" ? "bg-[#dc2626]" : "bg-[#eab308]"}`}
                  role="img"
                  aria-label={e.card === "red" ? t("match.redCardLabel") : t("match.yellowCardLabel")}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  <span className={e.kind === "goal" ? "font-semibold" : "text-foreground/90"}>{e.player}</span>
                  {tag && <span className="text-muted-2 ms-1 font-mono text-[10px] tracking-wide uppercase">({tag})</span>}
                </div>
                {e.assist && <div className="text-muted-2 truncate text-[11px]">{t("match.assist", { name: e.assist })}</div>}
              </div>
              {score && <span className="text-foreground shrink-0 font-mono text-sm font-bold tabular-nums">{score}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

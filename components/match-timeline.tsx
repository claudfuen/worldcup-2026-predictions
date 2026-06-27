import { getT, type TFunction } from "@/lib/i18n/server";
import type { MatchEvent } from "@/lib/matchEvents";

// The match's goals + cards as a centered, chronological match-sheet: each event sits on its team's side with
// the minute down the middle. Goals are a pitch-green dot (scorer bold + assist beneath); cards are a small
// yellow/red chip. Own goals are shown on the side they counted FOR, marked "(o.g.)". Shown for live and
// completed matches; renders nothing when there are no events.
export async function MatchTimeline({
  events, homeCode, awayCode,
}: {
  events: MatchEvent[];
  homeCode: string;
  awayCode: string;
}) {
  const t = await getT();
  if (!events.length) return null;
  return (
    <section className="mt-8">
      <h2 className="text-muted-foreground mb-3 font-mono text-xs font-semibold tracking-[0.1em] uppercase">{t("match.timeline")}</h2>
      <ol className="border-border bg-card divide-border/40 divide-y rounded-2xl border px-2 dark:inset-ring dark:inset-ring-white/5 sm:px-3">
        {events.map((e, i) => {
          // An own goal counts for the opponent, so it belongs on the other team's side.
          const own = e.kind === "goal" && e.goalType === "own";
          const onHome = own ? e.teamCode === awayCode : e.teamCode === homeCode;
          return (
            <li key={i} className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-1 py-2.5">
              <div className="flex justify-end">{onHome && <Event e={e} align="end" t={t} />}</div>
              <div className="text-muted-2 text-center font-mono text-[11px] tabular-nums">{e.minute}</div>
              <div className="flex justify-start">{!onHome && <Event e={e} align="start" t={t} />}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Event({ e, align, t }: { e: MatchEvent; align: "start" | "end"; t: TFunction }) {
  const end = align === "end";
  const icon =
    e.kind === "goal" ? (
      <span className="bg-primary mt-1 inline-block size-2.5 shrink-0 rounded-full" role="img" aria-label="Goal" />
    ) : (
      <span
        className={`mt-0.5 inline-block h-3.5 w-2.5 shrink-0 rounded-[2px] ${e.card === "red" ? "bg-[#dc2626]" : "bg-[#eab308]"}`}
        role="img"
        aria-label={e.card === "red" ? t("match.redCardLabel") : t("match.yellowCardLabel")}
      />
    );
  const tag = e.goalType === "penalty" ? t("match.penaltyTag") : e.goalType === "own" ? t("match.ownGoalTag") : null;
  const text = (
    <div className={`min-w-0 ${end ? "text-right" : "text-left"}`}>
      <div className="truncate text-sm">
        <span className={e.kind === "goal" ? "font-semibold" : "text-foreground/90"}>{e.player}</span>
        {tag && <span className="text-muted-2 ms-1 font-mono text-[10px] tracking-wide uppercase">({tag})</span>}
      </div>
      {e.assist && <div className="text-muted-2 truncate text-[11px]">{t("match.assist", { name: e.assist })}</div>}
    </div>
  );
  // Icon sits nearest the centre minute column: text→icon on the home (end) side, icon→text on the away side.
  return (
    <div className={`flex min-w-0 items-start gap-2 ${end ? "flex-row" : "flex-row-reverse"}`}>
      {text}
      {icon}
    </div>
  );
}

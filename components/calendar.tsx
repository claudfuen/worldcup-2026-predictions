"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchInfo } from "@/lib/predictions";
import { Flag } from "./flag";
import { fmtTimeShort, fmtDay, fmtDayKey, pct } from "@/lib/format";
import { useViewerZone } from "@/lib/useViewerZone";
import { useT, type TFunction } from "@/lib/i18n/provider";
import { useLocale } from "@/lib/i18n/client";
import { localeHref, type Locale } from "@/lib/i18n/config";

const ROUND_KEY: Record<string, string> = {
  GROUP: "rounds.GROUP", R32: "rounds.R32", R16: "rounds.R16", QF: "rounds.QF", SF: "rounds.SF", "3P": "rounds.THIRD", FINAL: "rounds.FINAL",
};

// The tournament spans June + July 2026 (2026-06-11 → 2026-07-19).
const MONTHS = [
  { year: 2026, month: 5 }, // June (0-indexed)
  { year: 2026, month: 6 }, // July
];

const pad = (n: number) => String(n).padStart(2, "0");

export function Calendar({ matches }: { matches: MatchInfo[] }) {
  const t = useT();
  const locale = useLocale();
  const { zone } = useViewerZone();
  // Resolve "today" only after mount (viewer-zone dependent) so SSR/hydration match.
  const [todayKey, setTodayKey] = useState<string | null>(null);
  useEffect(() => setTodayKey(fmtDayKey(new Date().toISOString(), zone)), [zone]);

  // Bucket matches into the viewer's local day (YYYY-MM-DD), chronological within a day.
  const byDay = new Map<string, MatchInfo[]>();
  for (const m of [...matches].sort((a, b) => a.utc.localeCompare(b.utc))) {
    const key = fmtDayKey(m.utc, zone);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(m);
  }

  // Localized weekday + month names (site locale, via zone.locale).
  const loc = zone.locale;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(loc, { weekday: "short" }).format(new Date(2024, 0, 1 + i)), // 2024-01-01 = Monday
  );

  const agendaDays = [...byDay.keys()].sort();

  return (
    <>
      {/* Desktop: month grid */}
      <div className="hidden space-y-10 md:block">
        {MONTHS.map(({ year, month }) => {
          const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-start
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const monthLabel = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric" }).format(new Date(year, month, 1));
          const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
          return (
            <section key={`${year}-${month}`}>
              <h2 className="mb-3 text-lg font-semibold tracking-tight capitalize">{monthLabel}</h2>
              <div className="grid grid-cols-7 gap-1.5">
                {weekdays.map((w, i) => (
                  <div key={i} className="text-muted-2 pb-1 text-center font-mono text-[10px] font-semibold tracking-wide uppercase">{w}</div>
                ))}
                {cells.map((d, i) => {
                  if (d == null) return <div key={`b${i}`} className="min-h-24 rounded-lg" />;
                  const key = `${year}-${pad(month + 1)}-${pad(d)}`;
                  const items = byDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  return (
                    <div key={key} className={`bg-card/30 min-h-24 rounded-lg border p-1 ${isToday ? "border-primary/60" : "border-border/50"}`}>
                      <div className={`mb-1 px-1 text-right font-mono text-[11px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{d}</div>
                      <div className="space-y-1">
                        {items.map((m) => <MatchCard key={m.match} m={m} zone={zone} locale={locale} t={t} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Mobile: agenda grouped by day */}
      <div className="space-y-6 md:hidden">
        {agendaDays.length === 0 && <p className="text-muted-foreground text-sm">{t("calendar.empty")}</p>}
        {agendaDays.map((key) => {
          const items = byDay.get(key)!;
          const isToday = key === todayKey;
          return (
            <section key={key}>
              <h2 className="text-muted-foreground mb-2 flex items-center gap-2 font-mono text-xs font-semibold tracking-wide uppercase" suppressHydrationWarning>
                {fmtDay(items[0].utc, zone)}
                {isToday && <span className="text-primary bg-primary/10 rounded px-1.5 py-0.5 text-[10px] tracking-normal normal-case">{t("calendar.today")}</span>}
              </h2>
              <div className="space-y-1.5">
                {items.map((m) => <MatchCard key={m.match} m={m} zone={zone} locale={locale} t={t} />)}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function MatchCard({ m, zone, locale, t }: { m: MatchInfo; zone: import("@/lib/format").Zone; locale: Locale; t: TFunction }) {
  const final = m.status === "final";
  const live = m.status === "live";
  const homeCode = m.home ?? m.projHome?.[0]?.code ?? null;
  const awayCode = m.away ?? m.projAway?.[0]?.code ?? null;
  const homeName = m.homeName ?? m.projHome?.[0]?.name ?? m.slotHome ?? t("common.tbd");
  const awayName = m.awayName ?? m.projAway?.[0]?.name ?? m.slotAway ?? t("common.tbd");
  const homeWin = final && (m.homeScore ?? 0) > (m.awayScore ?? 0);
  const awayWin = final && (m.awayScore ?? 0) > (m.homeScore ?? 0);
  const round = ROUND_KEY[m.round] ? t(ROUND_KEY[m.round]) : m.round;
  return (
    <Link
      href={localeHref(locale, `/match/${m.match}`)}
      className="border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30 block rounded-lg border transition-colors"
    >
      <div className="text-muted-2 flex items-center justify-between gap-1 px-2 pt-1.5 text-[10px]">
        <span className="truncate font-mono" suppressHydrationWarning>
          {live ? (
            <span className="text-live font-semibold">{m.liveDetail ?? "LIVE"}</span>
          ) : final ? (
            <span className="text-win font-semibold">{t("home.ft")}</span>
          ) : (
            fmtTimeShort(m.utc, zone)
          )}
        </span>
        <span className="shrink-0 truncate">{round}{m.group ? ` ${m.group}` : ""}</span>
      </div>
      <div className="space-y-0.5 px-2 pt-1 pb-1.5">
        <TeamLine code={homeCode} name={homeName} score={final || live ? m.homeScore : undefined} win={homeWin} projected={!m.home} prob={!m.home ? m.projHome?.[0]?.prob : undefined} />
        <TeamLine code={awayCode} name={awayName} score={final || live ? m.awayScore : undefined} win={awayWin} projected={!m.away} prob={!m.away ? m.projAway?.[0]?.prob : undefined} />
      </div>
    </Link>
  );
}

function TeamLine({ code, name, score, win, projected, prob }: { code: string | null; name: string; score?: number; win?: boolean; projected?: boolean; prob?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Flag code={code} size={14} />
      <span className={`min-w-0 flex-1 truncate text-xs ${win ? "font-semibold" : projected ? "text-foreground/70" : ""}`}>
        {name}
        {projected && prob != null && <span className="text-muted-2 ml-1 font-mono text-[9px]">{pct(Math.min(prob, 0.99))}</span>}
      </span>
      {score != null && <span className={`shrink-0 font-mono text-xs tabular-nums ${win ? "text-foreground font-bold" : "text-muted-foreground"}`}>{score}</span>}
    </div>
  );
}

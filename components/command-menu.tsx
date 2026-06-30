"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { splitLocale, localeHref, localeConfig } from "@/lib/i18n/config";
import { TEAMS, GROUPS } from "@/lib/data/teams";
import { VENUES } from "@/lib/data/venues";
import { SCHEDULE } from "@/lib/data/schedule";
import { slugForCode } from "@/lib/slug";
import { Flag } from "@/components/flag";

// A global ⌘K / Ctrl+K command palette: one search box across pages, teams, groups, stadiums and matches,
// so the whole app is reachable from any page by keyboard. Opens on the shortcut or via the nav trigger
// (which dispatches OPEN_COMMAND_EVENT). The index is built client-side from the static data modules.

export const OPEN_COMMAND_EVENT = "wc:open-command";

// Compact records from /api/search-index (codes only; names localized client-side).
interface RawMatch { n: number; round: string; utc: string; city: string; h: string | null; a: string | null; ph: string[]; pa: string[]; }
interface RawPlayer { name: string; team: string; slug: string; }

type ItemType = "page" | "team" | "player" | "group" | "venue" | "match";
interface Item {
  id: string;
  type: ItemType;
  label: string;
  sub?: string;
  href: string;
  code?: string; // flag (team code or host code)
  keywords: string; // lowercased haystack
}

const PAGES: { key: string; href: string }[] = [
  { key: "nav.overview", href: "/" },
  { key: "nav.groups", href: "/groups" },
  { key: "nav.bracket", href: "/bracket" },
  { key: "nav.schedule", href: "/schedule" },
  { key: "nav.calendar", href: "/calendar" },
  { key: "nav.stadiums", href: "/venues" },
  { key: "nav.awards", href: "/awards" },
  { key: "nav.scorecard", href: "/scorecard" },
  { key: "nav.method", href: "/methodology" },
];

const ROUND_KEY: Record<string, string> = {
  GROUP: "rounds.GROUP", R32: "rounds.R32", R16: "rounds.R16", QF: "rounds.QF", SF: "rounds.SF", "3P": "rounds.THIRD", FINAL: "rounds.FINAL",
};

export function CommandMenu() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [locale] = splitLocale(pathname || "/");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [matchData, setMatchData] = useState<RawMatch[] | null>(null);
  const [playerData, setPlayerData] = useState<RawPlayer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Lazy-load the live index on first open: matches (resolved + expected matchups) and players (everyone
  // with a tally) — codes only, names localized client-side.
  const openMenu = useCallback(() => {
    setQuery(""); setActive(0); setOpen(true);
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetch("/api/search-index")
        .then((r) => r.json())
        .then((d) => { setMatchData(d.matches ?? []); setPlayerData(d.players ?? []); })
        .catch(() => { fetchedRef.current = false; });
    }
  }, []);

  // Build the search index once per locale (team/page labels are localized).
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const p of PAGES) {
      const label = t(p.key);
      out.push({ id: `page:${p.href}`, type: "page", label, href: p.href, keywords: label.toLowerCase() });
    }
    for (const tm of TEAMS) {
      const name = t(`teams.${tm.code}`);
      out.push({
        id: `team:${tm.code}`, type: "team", label: name, sub: t("cmd.group", { letter: tm.group }),
        href: `/team/${slugForCode(tm.code)}`, code: tm.code,
        keywords: `${name} ${tm.code} ${tm.group}`.toLowerCase(),
      });
    }
    for (const g of GROUPS) {
      const label = t("cmd.group", { letter: g });
      out.push({ id: `group:${g}`, type: "group", label, href: `/group/${g.toLowerCase()}`, keywords: `${label} ${g}`.toLowerCase() });
    }
    for (const v of VENUES) {
      out.push({
        id: `venue:${v.slug}`, type: "venue", label: v.fifaName, sub: `${v.city} · ${v.key}`,
        href: `/venues/${v.slug}`, code: v.hostCode,
        keywords: `${v.fifaName} ${v.key} ${v.city} ${v.country}`.toLowerCase(),
      });
    }
    for (const p of playerData) {
      const team = t(`teams.${p.team}`);
      out.push({
        id: `player:${p.slug}`, type: "player", label: p.name, sub: team,
        href: `/player/${p.slug}`, code: p.team,
        keywords: `${p.name} ${team} ${p.team}`.toLowerCase(),
      });
    }
    const fmtShort = new Intl.DateTimeFormat(localeConfig(locale).intl, { month: "short", day: "numeric" });
    const nm = (c: string | null | undefined) => (c ? t(`teams.${c}`) : null);
    const vs = t("common.vs");
    if (matchData) {
      // Live index: resolved teams where known, else the expected matchup (top projected pair). Every
      // projected candidate goes into the keywords so a knockout tie is found by any likely participant.
      for (const mm of matchData) {
        const roundLabel = t(ROUND_KEY[mm.round] ?? "") || mm.round;
        const dateLabel = fmtShort.format(new Date(mm.utc));
        const iso = mm.utc.slice(0, 10);
        const hN = nm(mm.h);
        const aN = nm(mm.a);
        const projNames = [...mm.ph, ...mm.pa].map(nm).filter(Boolean) as string[];
        let label: string;
        let sub: string;
        if (hN && aN) {
          label = `${hN} ${vs} ${aN}`;
          sub = `${roundLabel} · ${dateLabel}`;
        } else if (nm(mm.ph[0]) && nm(mm.pa[0])) {
          label = `${nm(mm.ph[0])} ${vs} ${nm(mm.pa[0])}`;
          sub = `${roundLabel} · ${dateLabel} · ${t("common.projected")}`;
        } else {
          label = `${roundLabel} · ${t("cmd.matchN", { n: mm.n })}`;
          sub = dateLabel;
        }
        out.push({
          id: `match:${mm.n}`, type: "match", label, sub, href: `/match/${mm.n}`,
          keywords: `${hN ?? ""} ${aN ?? ""} ${projNames.join(" ")} ${roundLabel} ${dateLabel} ${iso} ${mm.city} match ${mm.n}`.toLowerCase(),
        });
      }
    } else {
      // Fallback before the live index loads: static schedule (group matchups + round/date for knockouts).
      for (const s of SCHEDULE) {
        const roundLabel = t(ROUND_KEY[s.round] ?? "") || s.round;
        const dateLabel = fmtShort.format(new Date(s.utc));
        const iso = s.utc.slice(0, 10);
        const label = s.home && s.away ? `${nm(s.home)} ${vs} ${nm(s.away)}` : `${roundLabel} · ${t("cmd.matchN", { n: s.match })}`;
        out.push({
          id: `match:${s.match}`, type: "match", label, sub: `${roundLabel} · ${dateLabel}`,
          href: `/match/${s.match}`,
          keywords: `${label} ${roundLabel} ${dateLabel} ${iso} ${s.city} match ${s.match}`.toLowerCase(),
        });
      }
    }
    return out;
  }, [t, locale, matchData, playerData]);

  const results = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.type === "page"); // empty state: jump-to-page list
    const tokens = q.split(/\s+/);
    const scored = items
      .filter((i) => tokens.every((tok) => i.keywords.includes(tok)))
      .map((i) => {
        // Rank: label-prefix > label-contains > keyword-only; then a stable type priority.
        const label = i.label.toLowerCase();
        const score = label.startsWith(q) ? 0 : label.includes(q) ? 1 : 2;
        return { i, score: score * 10 + TYPE_RANK[i.type] };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 40)
      .map((s) => s.i);
    return scored;
  }, [items, query]);

  // Open/close: ⌘K toggles from anywhere; the nav trigger fires OPEN_COMMAND_EVENT. Re-bound on each
  // open change so the handler reads the current state (cheap — one window listener).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (open) setOpen(false);
        else openMenu();
      }
    };
    const onOpen = () => openMenu();
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_EVENT, onOpen);
    };
  }, [open, openMenu]);

  // While open: focus the input and lock background scroll (no state writes — reset happens at open time).
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);

  // Keep the active row in view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (item?: Item) => {
    if (!item) return;
    setOpen(false);
    router.push(localeHref(locale, item.href));
  };

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label={t("cmd.title")}>
      <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="border-border-strong bg-surface-raised relative w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl dark:inset-ring dark:inset-ring-white/10" onKeyDown={onKeyDown}>
        <div className="border-border/70 flex items-center gap-2.5 border-b px-4">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="text-muted-foreground shrink-0" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder={t("cmd.placeholder")}
            className="text-foreground placeholder:text-muted-2 h-14 w-full bg-transparent text-base outline-none"
            role="combobox"
            aria-expanded
            aria-controls="cmd-results"
            aria-autocomplete="list"
          />
          <kbd className="text-muted-2 border-border bg-muted/40 hidden shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] sm:block">esc</kbd>
        </div>
        <div ref={listRef} id="cmd-results" role="listbox" className="max-h-[55vh] overflow-y-auto overscroll-contain py-2">
          {results.length === 0 ? (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">{t("cmd.empty", { q: query })}</div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                data-idx={idx}
                role="option"
                aria-selected={idx === active}
                onMouseMove={() => setActive(idx)}
                onClick={() => go(item)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${idx === active ? "bg-muted/60" : ""}`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center">
                  {item.code ? <Flag code={item.code} size={18} /> : <TypeIcon type={item.type} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-foreground block truncate text-sm font-medium">{item.label}</span>
                  {item.sub && <span className="text-muted-2 block truncate text-xs">{item.sub}</span>}
                </span>
                <span className="text-muted-2 shrink-0 font-mono text-[10px] tracking-wide uppercase">{t(`cmd.type_${item.type}`)}</span>
              </button>
            ))
          )}
        </div>
        <div className="border-border/70 text-muted-2 hidden items-center gap-4 border-t px-4 py-2 text-[10px] sm:flex">
          <span><Kbd>↑</Kbd><Kbd>↓</Kbd> {t("cmd.hintNav")}</span>
          <span><Kbd>↵</Kbd> {t("cmd.hintOpen")}</span>
          <span className="ms-auto"><Kbd>esc</Kbd> {t("cmd.hintClose")}</span>
        </div>
      </div>
    </div>
  );
}

const TYPE_RANK: Record<ItemType, number> = { page: 0, team: 1, player: 2, group: 3, venue: 4, match: 5 };

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="border-border bg-muted/40 mr-0.5 inline-block rounded border px-1 font-mono text-[10px]">{children}</kbd>;
}

function TypeIcon({ type }: { type: ItemType }) {
  const cls = "text-muted-foreground";
  if (type === "page")
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden><path d="M4 4h16v16H4z" /><path d="M4 9h16" /></svg>;
  if (type === "group")
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></svg>;
  if (type === "venue")
    return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
  // match
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></svg>;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { fmtTime, fmtDateTime } from "@/lib/format";
import { useViewerZone } from "@/lib/useViewerZone";

// The final is 2026-07-19; after it, the cron stops and the payload is the frozen final state. Past
// this instant the freshness indicator reads "Final" rather than an ever-growing "Updated Xd ago",
// which would wrongly signal neglected/stale data.
const TOURNAMENT_OVER_MS = Date.parse("2026-07-20T00:00:00Z");

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/groups", label: "Groups" },
  { href: "/bracket", label: "Bracket" },
  { href: "/schedule", label: "Schedule" },
  { href: "/methodology", label: "Method" },
];

export function Nav({ updatedAt }: { updatedAt: string | null }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // lock background scroll while the drawer is open
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch gap-1 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-4 flex shrink-0 items-center gap-2" aria-label="World Cup 2026 Predictions — home">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="text-primary" aria-hidden>
            <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v1a4 4 0 0 1-4 4" /><path d="M7 5H4v1a4 4 0 0 0 4 4" />
          </svg>
          <span className="font-display text-sm font-semibold tracking-tight">World Cup 2026</span>
        </Link>

        {/* Desktop nav (md+) */}
        <nav className="hidden flex-1 items-stretch gap-1 md:flex">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex items-center px-3 text-sm whitespace-nowrap ${active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l.label}
                {active && <span className="bg-primary absolute inset-x-3 bottom-0 h-0.5 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster: freshness + (mobile) hamburger */}
        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-2">
          <Freshness updatedAt={updatedAt} />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/40 -mr-2 ml-1 flex size-10 items-center justify-center rounded-lg md:hidden"
          >
            {open ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 top-14 bottom-0 z-40 bg-black/40 md:hidden"
          />
          <nav className="border-border/70 bg-background/95 absolute inset-x-0 top-14 z-50 space-y-0.5 border-b p-2 shadow-lg backdrop-blur-xl md:hidden">
            {LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-3 text-base ${active ? "bg-muted/50 text-foreground font-medium" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"}`}
                >
                  {l.label}
                  {active && <span className="bg-primary size-1.5 rounded-full" aria-hidden />}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </header>
  );
}

// Global data-freshness indicator: a dot (green/amber/grey by age) + how long ago the dataset updated.
// `now` starts null so SSR and first client render match (both show the absolute ET time); a 30s ticker
// then switches to a live "Xm ago" relative time without a hydration mismatch.
function Freshness({ updatedAt }: { updatedAt: string | null }) {
  const [now, setNow] = useState<number | null>(null);
  const { zone } = useViewerZone();
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!updatedAt) return null;
  if (now != null && now >= TOURNAMENT_OVER_MS) {
    return (
      <div
        className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs"
        title={`Final - predictions frozen at ${fmtDateTime(updatedAt, zone)}`}
      >
        <span className="size-1.5 shrink-0 rounded-full bg-win" aria-hidden />
        <span className="whitespace-nowrap">Final</span>
      </div>
    );
  }
  const min = now == null ? null : Math.max(0, (now - new Date(updatedAt).getTime()) / 60000);
  const rel =
    min == null
      ? fmtTime(updatedAt, zone)
      : min < 1
        ? "just now"
        : min < 60
          ? `${Math.round(min)}m ago`
          : min < 1440
            ? `${Math.round(min / 60)}h ago`
            : `${Math.round(min / 1440)}d ago`;
  const dot = min == null || min < 45 ? "bg-win" : min < 180 ? "bg-contention" : "bg-muted-foreground";
  return (
    <div
      className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs"
      title={`Live data updated ${fmtDateTime(updatedAt, zone)}`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="hidden whitespace-nowrap sm:inline">Updated {rel}</span>
      <span className="whitespace-nowrap sm:hidden">{rel}</span>
    </div>
  );
}

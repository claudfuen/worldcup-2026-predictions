import Link from "next/link";
import { getPredictions } from "@/lib/getPredictions";
import type { MatchInfo, SlotCandidate } from "@/lib/predictions";
import { Flag } from "@/components/flag";
import { MatchFlagButton } from "@/components/match-flag-button";
import { etDateTime, pct } from "@/lib/format";
import { getSessionUser, getUserMatches } from "@/lib/userMatches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MyMatch = MatchInfo & { tickets: number | null; note: string | null };

export default async function MatchesPage() {
  const user = await getSessionUser();
  if (!user) return <SignedOut />;

  const [data, rows] = await Promise.all([getPredictions(), getUserMatches(user.id)]);
  const byMatch = new Map(data.matches.map((m) => [m.match, m]));
  const mine: MyMatch[] = rows
    .map((r) => {
      const base = byMatch.get(r.matchNo);
      return base ? { ...base, tickets: r.tickets, note: r.note } : null;
    })
    .filter((m): m is MyMatch => m !== null)
    .sort((a, b) => a.utc.localeCompare(b.utc));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">My matches</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {mine.length === 0
            ? "You haven't saved any matches yet."
            : `${mine.length} saved. For undefined knockout slots, the most likely teams you'll see, per the model.`}
        </p>
      </div>
      {mine.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {mine.map((m) => (
            <TicketCard key={m.match} m={m} />
          ))}
        </div>
      )}
    </main>
  );
}

function SignedOut() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <div className="text-3xl">🎟️</div>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">My matches</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Sign in to save the matches you&apos;re going to or want to follow. They&apos;re kept to your account.
      </p>
      <Link
        href="/signin?next=/matches"
        className="bg-primary text-primary-foreground mt-6 inline-block rounded-xl px-5 py-3 text-sm font-medium"
      >
        Sign in
      </Link>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="border-border bg-card rounded-2xl border border-dashed p-8 text-center">
      <p className="text-muted-foreground text-sm">
        Browse the{" "}
        <Link href="/schedule" className="text-primary underline">
          schedule
        </Link>{" "}
        and tap the 🎟️ on any match to save it here.
      </p>
    </div>
  );
}

function TicketCard({ m }: { m: MyMatch }) {
  const roundName: Record<string, string> = {
    GROUP: m.group ? `Group ${m.group}` : "Group",
    R32: "Round of 32",
    R16: "Round of 16",
    QF: "Quarter-final",
    SF: "Semi-final",
    FINAL: "Final",
  };
  return (
    <Link
      href={`/match/${m.match}`}
      className="border-border bg-card hover:border-primary/40 block overflow-hidden rounded-2xl border"
    >
      <div className="border-border/60 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          {m.tickets ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
              🎟️ {m.tickets}
            </span>
          ) : null}
          <span className="text-sm font-semibold">{roundName[m.round]}</span>
          <span className="text-muted-foreground text-xs">M{m.match}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{etDateTime(m.utc)}</span>
          <MatchFlagButton matchNo={m.match} initialOn={true} isAuthed={true} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2">
        <SideBlock label={m.defined ? "" : "Likely"} code={m.home} title={m.homeName} candidates={m.projHome} slot={m.slotHome} />
        <SideBlock label={m.defined ? "" : "Likely"} code={m.away} title={m.awayName} candidates={m.projAway} slot={m.slotAway} />
      </div>
      {!m.defined && m.topMatchups && m.topMatchups.length > 0 && (
        <div className="border-border/50 border-t px-4 py-3">
          <div className="text-muted-foreground mb-2 font-mono text-[10px] tracking-wide uppercase">Most likely matchups</div>
          <div className="space-y-1.5">
            {m.topMatchups.map((mu) => (
              <div key={`${mu.home}|${mu.away}`} className="flex items-center gap-2 text-sm">
                <Flag code={mu.home} size={16} />
                <span className="truncate">{mu.homeName}</span>
                <span className="text-muted-foreground text-xs">v</span>
                <Flag code={mu.away} size={16} />
                <span className="flex-1 truncate">{mu.awayName}</span>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">{pct(mu.prob)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="border-border/50 text-muted-foreground border-t px-4 py-2 text-xs">
        📍 {m.venue}, {m.city}
        {m.note ? ` · ${m.note}` : ""}
      </div>
    </Link>
  );
}

function SideBlock({
  label,
  code,
  title,
  candidates,
  slot,
}: {
  label: string;
  code: string | null;
  title: string | null;
  candidates?: SlotCandidate[];
  slot?: string;
}) {
  if (title) {
    return (
      <div className="flex items-center gap-2">
        <Flag code={code} size={26} />
        <span className="text-lg font-semibold">{title}</span>
      </div>
    );
  }
  const list = candidates ?? [];
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 font-mono text-[10px] tracking-wide uppercase">
        {label} · {slot}
      </div>
      <div className="space-y-1">
        {list.slice(0, 3).map((c) => (
          <div key={c.code} className="flex items-center gap-2">
            <Flag code={c.code} size={18} />
            <span className="flex-1 truncate text-sm">{c.name}</span>
            <span className="text-muted-foreground font-mono text-xs tabular-nums">{pct(Math.min(c.prob, 0.99))}</span>
          </div>
        ))}
        {list.length === 0 && <span className="text-muted-foreground text-sm">TBD</span>}
      </div>
    </div>
  );
}

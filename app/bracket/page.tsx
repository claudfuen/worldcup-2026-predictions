import Link from "next/link";
import { getPredictions } from "@/lib/getPredictions";
import { getLiveMatches, overlayLive, liveActivity } from "@/lib/live";
import { finalizeGroups, finalizeBracket, ratingsFromTeams } from "@/lib/liveProjection";
import { Bracket } from "@/components/bracket";
import { Flag } from "@/components/flag";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { ShareBar } from "@/components/share-bar";
import { forecastPct, pct } from "@/lib/format";
import { teamSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BRACKET_TITLE = "World Cup 2026 Bracket Predictor - Live Knockout Simulation";
const BRACKET_DESC =
  "Projected 2026 World Cup knockout bracket: the most likely team in every Round-of-32 to Final slot, with full FIFA Annex C third-place modelling, updated live.";
export const metadata = {
  title: { absolute: BRACKET_TITLE },
  description: BRACKET_DESC,
  alternates: { canonical: "/bracket" },
  openGraph: { title: BRACKET_TITLE, description: BRACKET_DESC, url: "/bracket", type: "website" },
  twitter: { card: "summary_large_image", title: BRACKET_TITLE, description: BRACKET_DESC },
};

export default async function BracketPage() {
  const [data, live] = await Promise.all([getPredictions(), getLiveMatches()]);
  const hasLive = liveActivity(data.matches, live);
  // Lock knockout participants the instant their group decides (and resolve third-place slots once the
  // group stage completes), rather than waiting for the next cron tick.
  const overlaid = overlayLive(data.matches, live);
  const ratings = ratingsFromTeams(data.teams);
  const matches = hasLive ? finalizeBracket(overlaid, finalizeGroups(data.groups, overlaid, ratings), ratings) : data.matches;
  const champ = data.teams[0];
  const reachFinal = new Map(data.teams.map((t) => [t.code, t.final]));
  const finalM = matches.find((m) => m.round === "FINAL");
  const fHome = finalM?.home ?? finalM?.projHome?.[0]?.code ?? null;
  const fAway = finalM?.away ?? finalM?.projAway?.[0]?.code ?? null;
  const fHomeName = finalM?.homeName ?? finalM?.projHome?.[0]?.name ?? "TBD";
  const fAwayName = finalM?.awayName ?? finalM?.projAway?.[0]?.name ?? "TBD";
  const r32 = matches.filter((m) => m.round === "R32");
  const r32Set = r32.filter((m) => m.defined).length;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <LiveAutoRefresh enabled={hasLive} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">World Cup 2026 bracket</h1>

        {/* At-a-glance dashboard strip: the takeaways before the tree */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {champ && (
            <Link href={`/team/${teamSlug(champ.name)}`} className="group border-border bg-card hover:border-primary/50 hover:bg-surface-raised rounded-2xl border p-4 transition-colors">
              <div className="text-muted-foreground font-mono text-[10px] font-semibold tracking-wide uppercase">Projected champion</div>
              <div className="mt-2 flex items-center gap-2">
                <Flag code={champ.code} size={24} />
                <span className="truncate font-semibold group-hover:underline">{champ.name}</span>
                <span className="text-primary ml-auto shrink-0 font-mono text-sm font-semibold tabular-nums">{forecastPct(champ.title)}</span>
              </div>
            </Link>
          )}
          <div className="border-border bg-card rounded-2xl border p-4">
            <div className="text-muted-foreground font-mono text-[10px] font-semibold tracking-wide uppercase">Projected final</div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Flag code={fHome} size={20} /><span className="min-w-0 truncate font-medium">{fHomeName}</span>
              <span className="text-muted-2 shrink-0 text-xs">v</span>
              <Flag code={fAway} size={20} /><span className="min-w-0 truncate font-medium">{fAwayName}</span>
            </div>
            {fHome && fAway && (
              <div className="text-muted-2 mt-1.5 font-mono text-[10px] tabular-nums">{pct(reachFinal.get(fHome) ?? 0)} · {pct(reachFinal.get(fAway) ?? 0)} to reach</div>
            )}
          </div>
          <div className="border-border bg-card rounded-2xl border p-4">
            <div className="text-muted-foreground font-mono text-[10px] font-semibold tracking-wide uppercase">Round of 32</div>
            <div className="mt-2 text-sm"><span className="font-semibold tabular-nums">{r32Set} of {r32.length}</span> ties confirmed</div>
            <div className="text-muted-2 mt-1.5 text-[11px]">{r32.length - r32Set} still projected</div>
          </div>
        </div>

        <p className="text-muted-2 mt-4 text-xs text-pretty">
          Each <span className="text-foreground/70">%</span> is how often a team fills that slot across our simulations — not its
          chance of winning the match. Third-place slots lock once the group stage ends; resolved teams are bold. Scroll across
          to follow the path to the final.
        </p>
        {champ && (
          <div className="mt-3">
            <ShareBar
              text={`The model's projected World Cup 2026 champion: ${champ.name} (${forecastPct(champ.title)}). See the full bracket:`}
              path="/bracket"
            />
          </div>
        )}
      </div>
      <Bracket
        matches={matches}
        champion={data.teams[0] ? { code: data.teams[0].code, name: data.teams[0].name, prob: data.teams[0].title } : undefined}
      />
      <div className="border-border bg-card mt-6 rounded-2xl border p-4">
        <h2 className="mb-2 text-base font-semibold tracking-tight">Third-place play-off</h2>
        <ThirdPlace matches={matches} />
      </div>
    </main>
  );
}

function ThirdPlace({ matches }: { matches: { match: number; projHome?: { code: string; name: string }[]; projAway?: { code: string; name: string }[] }[] }) {
  const m = matches.find((x) => x.match === 103);
  if (!m) return null;
  const h = m.projHome?.[0];
  const a = m.projAway?.[0];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {h && <Flag code={h.code} size={16} />}
      <span className="text-foreground/90">{h?.name ?? "TBD"}</span>
      <span className="text-muted-foreground">vs</span>
      {a && <Flag code={a.code} size={16} />}
      <span className="text-foreground/90">{a?.name ?? "TBD"}</span>
      <span className="text-muted-2">· Miami, Jul 18</span>
    </div>
  );
}

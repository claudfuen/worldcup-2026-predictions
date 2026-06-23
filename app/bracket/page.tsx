import { getPredictions } from "@/lib/getPredictions";
import { Bracket } from "@/components/bracket";
import { Flag } from "@/components/flag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BracketPage() {
  const data = await getPredictions();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Knockout bracket</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Most likely team in each slot. Each <span className="text-foreground/80">%</span> is how often that team fills
          the slot across our simulations - not its chance of winning the match. Third-place slots show the candidate
          groups (which best-third lands there depends on the final mix). Resolved teams are bold. Scroll horizontally
          to follow the path to the final.
        </p>
      </div>
      <Bracket matches={data.matches} />
      <div className="border-border bg-card mt-6 rounded-xl border p-4">
        <h2 className="mb-1 text-sm font-semibold">Third-place play-off</h2>
        <ThirdPlace matches={data.matches} />
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
      <span className="text-muted-foreground/70">· Miami, Jul 18</span>
    </div>
  );
}

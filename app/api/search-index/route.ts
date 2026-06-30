import { NextResponse } from "next/server";
import { getPredictions } from "@/lib/getPredictions";
import { getLiveMatches, overlayLive } from "@/lib/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compact match index for the ⌘K command palette, fetched lazily on first open. Returns CODES only (the
// client localizes names) so it stays tiny: resolved participants where known, plus the top projected
// candidates per slot so unresolved knockout ties are searchable by their EXPECTED matchups. Overlaid with
// the live feed so a just-finished knockout shows its real teams immediately.
export async function GET() {
  try {
    const data = await getPredictions();
    let matches = data.matches;
    try {
      matches = overlayLive(data.matches, await getLiveMatches());
    } catch {
      /* live feed down — use the cached payload */
    }
    const out = matches.map((m) => ({
      n: m.match,
      round: m.round,
      utc: m.utc,
      city: m.city,
      h: m.home,
      a: m.away,
      ph: (m.projHome ?? []).slice(0, 3).map((c) => c.code),
      pa: (m.projAway ?? []).slice(0, 3).map((c) => c.code),
    }));
    return NextResponse.json({ matches: out }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ matches: [] });
  }
}

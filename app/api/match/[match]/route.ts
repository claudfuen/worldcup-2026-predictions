import { NextResponse } from "next/server";
import { loadMatchLive, type MatchLivePayload } from "@/lib/matchLive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live state of one match, polled by the match page (SWR). Returns the same slice the page renders from on
// the server, so the client islands (hero score/clock, live win-prob, timeline, stats, provisional table)
// update in place with no full-page refresh. Cheap: a KV read + the ~12s-cached ESPN feed/summary.
export async function GET(_req: Request, { params }: { params: Promise<{ match: string }> }) {
  const { match } = await params;
  const n = Number(match);
  if (!Number.isInteger(n)) return NextResponse.json({ error: "bad match" }, { status: 400 });
  try {
    const loaded = await loadMatchLive(n);
    if (!loaded) return NextResponse.json({ error: "not found" }, { status: 404 });
    const payload: MatchLivePayload = {
      m: loaded.m,
      summary: loaded.summary,
      liveProbs: loaded.liveProbs,
      proj: loaded.proj,
      hasLive: loaded.hasLive,
    };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}

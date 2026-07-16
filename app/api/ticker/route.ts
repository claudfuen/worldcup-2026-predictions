import { NextResponse } from "next/server"
import { getPredictions } from "@/lib/getPredictions"
import {
  getLiveMatches,
  overlayLive,
  selectTickerItems,
  liveActivity,
} from "@/lib/live"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Lightweight live snapshot for the score ticker. The client polls this (SWR) so live scores tick on their
// own without a full page re-render. Cheap: a KV read for the cached payload + the ~12s-cached ESPN feed, so
// a traffic spike during a match can't hammer ESPN regardless of how many tabs are polling.
export async function GET() {
  try {
    const data = await getPredictions()
    let matches = data.matches
    let hasLive = false
    try {
      const live = await getLiveMatches()
      matches = overlayLive(data.matches, live)
      hasLive = liveActivity(data.matches, live)
    } catch {
      // live feed unavailable — serve the cached payload's results
    }
    return NextResponse.json({ items: selectTickerItems(matches), hasLive })
  } catch {
    return NextResponse.json({ items: [], hasLive: false })
  }
}

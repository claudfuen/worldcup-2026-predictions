import { computePredictions } from "./lib/predictions"
import { computeFinalRanking, finalRankingReady } from "./lib/finalRanking"
const p = await computePredictions(20000, 20260611)
console.log("ready:", finalRankingReady(p.matches))
const r = computeFinalRanking(p.matches)
console.log("total ranked:", r.length)
const tierCount: Record<string, number> = {}
for (const t of r) tierCount[t.tier] = (tierCount[t.tier] || 0) + 1
console.log("tiers:", JSON.stringify(tierCount))
for (const t of r) {
  const place = t.settled ? `#${t.rank}` : `${t.rankLo}-${t.rankHi}`
  console.log(
    `${place.padStart(6)} ${t.tier.padEnd(6)} ${t.name.padEnd(14)} P${t.played} ${t.win}-${t.draw}-${t.loss} GF${t.gf} GA${t.ga} GD${t.gd >= 0 ? "+" : ""}${t.gd} pts${t.points}${t.outcome ? " " + t.outcome : ""}`
  )
}

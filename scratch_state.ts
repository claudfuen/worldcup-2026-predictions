import { computePredictions } from "./lib/predictions"
const p = await computePredictions(20000, 20260611)
const alive = p.teams.filter((t) => t.title > 0)
console.log(
  "alive teams:",
  alive
    .map(
      (t) =>
        `${t.name} title=${(t.title * 100).toFixed(0)}% final=${(t.final * 100).toFixed(0)}%`
    )
    .join(" | ")
)
console.log("complete:", p.complete, "champion:", p.champion)
const byRound: Record<string, { played: number; total: number }> = {}
for (const m of p.matches) {
  const r = m.round || "?"
  byRound[r] = byRound[r] || { played: 0, total: 0 }
  byRound[r].total++
  if (m.status === "final") byRound[r].played++
}
console.log("rounds:", JSON.stringify(byRound))
const tp = p.matches.find(
  (m) => m.round === "3P" || m.round === "THIRD" || m.round === "3RD"
)
console.log(
  "3P match:",
  tp
    ? `${tp.homeName ?? tp.home} vs ${tp.awayName ?? tp.away} status=${tp.status}`
    : "(round key not 3P)"
)
console.log(
  "all round keys:",
  [...new Set(p.matches.map((m) => m.round))].join(",")
)
console.log("thirdPlaceRace len:", (p as any).thirdPlaceRace?.length)

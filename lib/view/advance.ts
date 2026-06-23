import type { GroupTeamView } from "@/lib/predictions";
import { forecastPct } from "@/lib/format";
import type { AdvanceDisplay, Tone } from "./types";

// THE single mapping from a group row's clinch status -> how its advancement renders. Every
// standings/advance surface calls this; none re-derives the ladder. `rank` is the 0-based finishing
// position in the (already-ranked) group, used only to tone a non-clinched forecast.
export function teamAdvanceDisplay(row: GroupTeamView, rank: number): AdvanceDisplay {
  switch (row.status) {
    case "won_group":
      return { kind: "wonGroup", symbol: "👑", label: "✓ 1st", tone: "win" };
    case "second":
      return { kind: "runnerUp", symbol: "✓", label: "✓ 2nd", tone: "win" };
    case "advanced":
      return { kind: "advanced", symbol: "✓", label: "✓ in", tone: "win" };
    case "eliminated":
      return { kind: "eliminated", symbol: null, label: "out", tone: "eliminated" };
    default: {
      const tone: Tone = rank <= 1 ? "win" : rank === 2 ? "contention" : "muted";
      return { kind: "forecast", symbol: null, pct: forecastPct(row.advance), tone, delta: row.advanceDelta };
    }
  }
}

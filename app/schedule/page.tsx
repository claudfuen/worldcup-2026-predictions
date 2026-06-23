import { getPredictions } from "@/lib/getPredictions";
import { getLiveMatches, overlayLive } from "@/lib/live";
import { ScheduleList } from "@/components/schedule-list";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchedulePage() {
  const [data, live] = await Promise.all([getPredictions(), getLiveMatches()]);
  const matches = overlayLive(data.matches, live);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <LiveAutoRefresh enabled={matches.some((m) => m.status === "live")} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All 104 matches, shown in your local time. Undefined knockout slots show the most likely team; defined matches
          show the model favorite.
        </p>
      </div>
      <ScheduleList matches={matches} />
    </main>
  );
}

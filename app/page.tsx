import { getPredictions } from "@/lib/getPredictions";
import { getLiveMatches, overlayLive, liveActivity } from "@/lib/live";
import { finalizeGroups, ratingsFromTeams } from "@/lib/liveProjection";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { MastheadVerdict } from "@/components/masthead-verdict";
import { MoverStrip } from "@/components/mover-strip";
import { TournamentStage } from "@/components/tournament-stage";
import { LiveTodayRail } from "@/components/live-today-rail";
import { MatchesToWatch } from "@/components/matches-to-watch";
import { BracketTeaser } from "@/components/bracket-teaser";
import { GroupsPreview } from "@/components/groups-preview";
import { TitleOdds } from "@/components/title-odds";
import { LaunchRail } from "@/components/launch-rail";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const [data, live] = await Promise.all([getPredictions(), getLiveMatches()]);
  const matches = overlayLive(data.matches, live);
  const hasLive = liveActivity(data.matches, live);
  // Finalize group clinch from results known right now, so the watch plan's decider signal is live-accurate.
  const groups = hasLive ? finalizeGroups(data.groups, matches, ratingsFromTeams(data.teams)) : data.groups;
  // Live-accurate group progress for the stage tracker (counts group finals as they land, ahead of cron).
  const groupPlayed = matches.filter((m) => m.round === "GROUP" && m.status === "final").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <LiveAutoRefresh enabled={hasLive} />

      {/* 1. The model's call — the signature, the most-important thing first */}
      <header className="mb-6 max-w-3xl">
        <MastheadVerdict teams={data.teams} iterations={data.iterations} />
        <MoverStrip teams={data.teams} />
      </header>

      {/* 2. Where the whole tournament is right now */}
      <TournamentStage matches={matches} matchesPlayed={groupPlayed} totalGroupMatches={data.totalGroupMatches} className="mb-10" />

      {/* 3. What's happening now */}
      <LiveTodayRail matches={matches} className="mb-10" />

      {/* 4. What to watch next — the curated plan */}
      <MatchesToWatch matches={matches} teams={data.teams} groups={groups} className="mb-10" />

      {/* 5. Launchpad — dive into the bracket and the groups */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <BracketTeaser matches={matches} teams={data.teams} />
        <GroupsPreview groups={groups} />
      </div>

      {/* 6. The title race in depth */}
      <TitleOdds teams={data.teams} className="mb-10" />

      {/* 7. Launch anywhere + trust */}
      <LaunchRail teams={data.teams} iterations={data.iterations} />
    </main>
  );
}

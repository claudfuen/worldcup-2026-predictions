import { getPredictions, getLiveAwards } from "@/lib/getPredictions";
import { getLiveMatches, overlayLive, liveActivity, attachLiveProbs } from "@/lib/live";
import { finalizeGroups, ratingsFromTeams } from "@/lib/liveProjection";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { MastheadVerdict } from "@/components/masthead-verdict";
import { TournamentStage } from "@/components/tournament-stage";
import { LiveTodayRail } from "@/components/live-today-rail";
import { MatchesToWatch } from "@/components/matches-to-watch";
import { BracketTeaser } from "@/components/bracket-teaser";
import { GroupsPreview } from "@/components/groups-preview";
import { GoldenBootRace } from "@/components/golden-boot-race";
import { StadiumSpotlight } from "@/components/stadium-spotlight";
import { LaunchRail } from "@/components/launch-rail";
import { computeWatchability } from "@/lib/watchability";
import { getT } from "@/lib/i18n/server";
import { localizeTeams, localizeMatches, localizeGroups } from "@/lib/i18n/localize-payload";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const t = await getT();
  const [data, live, awards] = await Promise.all([getPredictions(), getLiveMatches(), getLiveAwards()]);
  const ratings = ratingsFromTeams(data.teams);
  // Overlay live scores, then attach the current (live-conditioned) win probability to each in-progress match.
  const matches = attachLiveProbs(overlayLive(data.matches, live), ratings);
  const hasLive = liveActivity(data.matches, live);
  // Finalize group clinch from results known right now, so the watch plan's decider signal is live-accurate.
  const groups = hasLive ? finalizeGroups(data.groups, matches, ratings) : data.groups;
  // Live-accurate group progress for the stage tracker (counts group finals as they land, ahead of cron).
  const groupPlayed = matches.filter((m) => m.round === "GROUP" && m.status === "final").length;
  // Hot-match reasons, so today's worth-watching games are badged in the live rail (consistent with the plan).
  const hotReasons: Record<number, string> = {};
  for (const p of computeWatchability(matches, data.teams, groups).byMatch.values()) {
    if (p.hot) hotReasons[p.match.match] = t(p.reason.key, p.reason.params);
  }

  // Localize team display names (codes → native names) on the FINAL structures, after the live
  // transforms above (which re-derive English names). watchability ran on the raw data, by code.
  const teams = localizeTeams(data.teams, t);
  const lMatches = localizeMatches(matches, t);
  const lGroups = localizeGroups(groups, t);

  // Once every group match is in, the group stage is settled — drop the (now-static) groups snapshot so the
  // homepage doesn't carry dead weight into the knockouts.
  const groupStageOver = groupPlayed >= data.totalGroupMatches;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <LiveAutoRefresh enabled={hasLive} />

      {/* ACT I — THE CALL: the hero (model's pick + title race + the day's movement, fused into one
          display-scale contender leaderboard) with the tournament-stage bridge rule beneath it. */}
      <header>
        <MastheadVerdict teams={teams} iterations={data.iterations} complete={data.complete} champion={data.champion} finalMatch={lMatches.find((mm) => mm.round === "FINAL")} />
      </header>
      <TournamentStage matches={lMatches} matchesPlayed={groupPlayed} totalGroupMatches={data.totalGroupMatches} className="mt-6" />

      {/* ACT II — RIGHT NOW: the live heartbeat (Today emphasized), closing on the venue spotlight. */}
      <section className="border-border/60 mt-14 border-t pt-6 sm:mt-16">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("home.actNow")}</h2>
        <LiveTodayRail matches={lMatches} hotReasons={hotReasons} className="mt-5" />
        <StadiumSpotlight matches={lMatches} className="mt-4" />
      </section>

      {/* ACT III — THE ROAD AHEAD: where the bracket is heading, the season-long races, and the games worth
          planning for. Grid widens to 3 columns only when the groups tile is present. */}
      <section className="border-border/60 mt-14 border-t pt-6 sm:mt-16">
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("home.actAhead")}</h2>
        <div className={`mt-5 grid gap-4 sm:grid-cols-2 ${groupStageOver ? "" : "lg:grid-cols-3"}`}>
          <BracketTeaser matches={lMatches} teams={teams} />
          {!groupStageOver && <GroupsPreview groups={lGroups} />}
          <GoldenBootRace entries={awards.goldenBoot} />
        </div>
        <MatchesToWatch matches={lMatches} teams={teams} groups={lGroups} className="mt-8" />
      </section>

      <LaunchRail teams={teams} iterations={data.iterations} className="mt-12" />
    </main>
  );
}

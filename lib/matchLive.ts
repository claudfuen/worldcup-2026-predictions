import { getPredictions } from "./getPredictions";
import { getLiveMatches, overlayLive, liveActivity, liveMatchProbs, type LiveProbs } from "./live";
import { ratingsFromTeams, finalizeGroups, finalizeBracket, provisionalGroup, type ProvisionalGroup } from "./liveProjection";
import { getMatchSummary, type MatchSummary } from "./matchEvents";
import type { MatchInfo, PredictionsPayload, GroupView } from "./predictions";
import type { Ratings } from "./sim/types";

// The live-changing slice of a single match — everything the client islands re-render on each poll. Codes
// (not localized names) so the API stays locale-agnostic; the client localizes via the i18n provider.
export type MatchLivePayload = {
  m: MatchInfo;
  summary: MatchSummary;
  liveProbs: LiveProbs | null;
  proj: ProvisionalGroup | null;
  hasLive: boolean;
};

// Everything the match PAGE needs for its initial server render — the live payload plus the surrounding
// context (full team list, all matches, ratings) the static sections (outlook, bracket path, explore) use.
export type LoadedMatch = MatchLivePayload & {
  data: PredictionsPayload;
  all: MatchInfo[];
  groups: GroupView[];
  ratings: Ratings;
};

// Single source of truth for "the current state of match N", used by BOTH the page's initial SSR and the
// /api/match/[n] poll endpoint — so the SWR fallbackData and every subsequent poll are computed identically
// (no hydration drift). Mirrors exactly what the page used to compute inline: live overlay → live-finalized
// bracket/groups → per-match summary, live win-prob, and provisional group table.
export async function loadMatchLive(n: number): Promise<LoadedMatch | null> {
  const [data, live] = await Promise.all([getPredictions(), getLiveMatches()]);
  const overlaid = overlayLive(data.matches, live);
  const hasLive = liveActivity(data.matches, live);
  const ratings = ratingsFromTeams(data.teams);
  // Lock participants/standings the instant feeding groups decide, ahead of the cron — only when something
  // is live (otherwise the cron payload is already authoritative).
  const groups = hasLive ? finalizeGroups(data.groups, overlaid, ratings) : data.groups;
  const all = hasLive ? finalizeBracket(overlaid, groups, ratings) : overlaid;
  const m = all.find((x) => x.match === n);
  if (!m) return null;
  const summary = await getMatchSummary(m);
  const liveProbs = liveMatchProbs(m, ratings, summary);
  const proj =
    m.status === "live" && m.group
      ? provisionalGroup(m.group, all.filter((x) => x.round === "GROUP" && x.group === m.group), ratings)
      : null;
  return { data, all, groups, ratings, m, summary, liveProbs, proj, hasLive };
}

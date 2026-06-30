import { teamSlug } from "./slug";
import type { Awards, AwardEntry } from "./awards";

// The player universe is everyone who has a tally in the awards boards (a goal or an assist) — the only
// players we have reliable data for. Each gets a stable slug (teamcode-nameslug) so routes/sitemap/search
// stay consistent, disambiguated by team in the rare same-name case.

export interface PlayerRef {
  player: string;
  teamCode: string;
  slug: string;
}

export function playerSlug(player: string, teamCode: string): string {
  return `${teamCode.toLowerCase()}-${teamSlug(player)}`;
}

/** Unique (player, team) across both award boards. */
export function playerUniverse(awards: Awards): PlayerRef[] {
  const seen = new Map<string, PlayerRef>();
  for (const e of [...awards.goldenBoot, ...awards.assists]) {
    const slug = playerSlug(e.player, e.teamCode);
    if (!seen.has(slug)) seen.set(slug, { player: e.player, teamCode: e.teamCode, slug });
  }
  return [...seen.values()];
}

export interface PlayerView {
  player: string;
  teamCode: string;
  goldenBoot?: AwardEntry; // entry on the Golden Boot board, with its rank
  gbRank?: number;
  assists?: AwardEntry; // entry on the assists board, with its rank
  asRank?: number;
}

/** Resolve a player slug against the awards boards, carrying each board's entry + 1-based rank. */
export function findPlayer(awards: Awards, slug: string): PlayerView | null {
  const gbIdx = awards.goldenBoot.findIndex((e) => playerSlug(e.player, e.teamCode) === slug);
  const asIdx = awards.assists.findIndex((e) => playerSlug(e.player, e.teamCode) === slug);
  if (gbIdx < 0 && asIdx < 0) return null;
  const base = gbIdx >= 0 ? awards.goldenBoot[gbIdx] : awards.assists[asIdx];
  return {
    player: base.player,
    teamCode: base.teamCode,
    goldenBoot: gbIdx >= 0 ? awards.goldenBoot[gbIdx] : undefined,
    gbRank: gbIdx >= 0 ? gbIdx + 1 : undefined,
    assists: asIdx >= 0 ? awards.assists[asIdx] : undefined,
    asRank: asIdx >= 0 ? asIdx + 1 : undefined,
  };
}

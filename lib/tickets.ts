import { STUBHUB_BY_MATCH } from "./data/ticketLinks";

/**
 * Centralized ticket-link layer. EVERYTHING about outbound ticket links lives here so the whole
 * site can be re-pointed from one file:
 *   - retag UTMs in one place,
 *   - flip every link to an affiliate redirect by setting AFFILIATE.wrap (no UI/page changes),
 *   - keep rel/target consistent (rendered by <TicketLink>).
 *
 * Today: clean StubHub deep links (lib/data/ticketLinks.ts) + UTM tags identifying us as the source.
 * The per-match URLs were verified against our schedule (venue city + local date, 104/104).
 *
 * LATER (affiliate): set AFFILIATE.wrap to your network's click-through (e.g. Partnerize/Impact, the
 * same pattern ticketdata itself uses) and/or add your sub-id in buildDest(). Every ticket link across
 * the site — match pages, schedule, team pages — updates automatically, and TICKET_REL flips to
 * "sponsored".
 */

export const TICKET_PROVIDER = "StubHub";

// UTM tags applied to every ticket link (identifies our site as the traffic source). When we monetize,
// change `medium` to "affiliate".
const UTM = {
  source: "worldcup2026predictions",
  medium: "referral",
  campaign: "match_tickets",
} as const;

// ── AFFILIATE SWAP POINT ──────────────────────────────────────────────────────────────────────────
// While `wrap` is null we emit plain (UTM-tagged) StubHub links. To monetize, set `wrap` to turn the
// clean destination URL into your tracked click URL — that's the ONLY change needed sitewide.
const AFFILIATE: { wrap: ((destUrl: string) => string) | null } = {
  wrap: null,
  // Example (Partnerize, like ticketdata's own links):
  // wrap: (dest) => `https://stubhub.prf.hn/click/camref:YOURCAMREF/destination:${dest}`,
};
// ──────────────────────────────────────────────────────────────────────────────────────────────────

/** rel for outbound commercial ticket links — auto-upgrades to "sponsored" once affiliate is live. */
export const TICKET_REL = AFFILIATE.wrap
  ? "sponsored noopener noreferrer"
  : "nofollow noopener noreferrer";

/** Does this match have a known ticket deep link? */
export function hasTickets(matchNo: number): boolean {
  return !!STUBHUB_BY_MATCH[matchNo];
}

function buildDest(matchNo: number, placement: string): string | null {
  const base = STUBHUB_BY_MATCH[matchNo];
  if (!base) return null;
  const u = new URL(base);
  u.searchParams.set("utm_source", UTM.source);
  u.searchParams.set("utm_medium", UTM.medium);
  u.searchParams.set("utm_campaign", UTM.campaign);
  u.searchParams.set("utm_content", placement); // WHERE the click came from (be mindful of placement)
  return u.toString();
}

/**
 * Final outbound ticket URL for a match, or null if none.
 * @param placement short, stable tag for the surface the link sits on (utm_content), e.g.
 *                  "match_page", "schedule_row", "team_fixtures". Lets us attribute clicks per surface.
 */
export function ticketUrl(matchNo: number, placement: string): string | null {
  const dest = buildDest(matchNo, placement);
  if (!dest) return null;
  return AFFILIATE.wrap ? AFFILIATE.wrap(dest) : dest;
}

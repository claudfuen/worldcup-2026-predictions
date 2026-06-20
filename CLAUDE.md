# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Monte Carlo predictor for the 2026 FIFA World Cup. It pulls live results from ESPN's public feed, replays Elo ratings, runs ~20k tournament simulations, and serves probabilities (group winner / advance / reach-each-round / champion) plus mathematically-certain clinch states through a Next.js dashboard. See `README.md` for the public-facing summary.

## Commands

Package manager is **bun** (`bun.lock`).

```bash
bun install
bun run dev          # Next.js dev server
bun run build        # production build
bun run typecheck    # tsc --noEmit (build does NOT type-check; run this)
bun run lint         # eslint
bun run format       # prettier --write
bun run test         # vitest run (all tests)
bun run test tests/standings.test.ts   # single test file
bun run test -t "head-to-head"          # filter by test name
bun run test:watch
```

Dev / QA scripts (run directly with bun — they live in `scripts/`, excluded from the Next build and from `tsc`):

```bash
bun run scripts/bench.ts    # benchmark the Monte Carlo at 10k/20k/50k iters
bun run scripts/smoke.ts    # end-to-end: live ESPN fetch -> computePredictions -> KV roundtrip
python3 scripts/qa.py       # asserts invariants against the DEPLOYED app's /api/data (not local)
```

Auth / database (Neon Postgres via BetterAuth — see "Auth & per-user data" below):

```bash
bun run auth:migrate        # create/update the BetterAuth tables (user/session/account/verification)
bun run db:init             # create the user_match table (run AFTER auth:migrate — it FKs to "user")
bun run db:seed-mine you@example.com   # copy the static MY_MATCHES onto a real account (one-off)
```

`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `CRON_SECRET` live in `.env.local` (gitignored). KV is optional for dev — without it, every page render computes predictions fresh (slow, ~6s) instead of reading the cache. Auth/DB also needs `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and (optional in dev) `RESEND_API_KEY` + `EMAIL_FROM`. Without `RESEND_API_KEY`, magic links are printed to the server console instead of emailed.

## ⚠️ Next.js version

This is **Next.js 16.2.6** — newer than most training data, with breaking changes to APIs/conventions. Per `AGENTS.md`: **read the relevant guide in `node_modules/next/dist/docs/` before writing Next code**, and heed deprecation notices. Don't assume App Router behavior from memory.

## Architecture

### Data flow (the spine)

`computePredictions()` in `lib/predictions.ts` is the whole pipeline and the place to start:

1. `fetchResults()` (`lib/espn.ts`) — completed matches from ESPN's `fifa.world` scoreboard (no key). Maps ESPN names → internal team codes via `TEAM_BY_ESPN`.
2. `liveRatings()` — pre-tournament Elo with every completed match **replayed** (`updateElo`). Deterministic, no drift.
3. `buildGroupMatches()` — 12 round-robin groups, completed results filled in.
4. `runMonteCarlo()` (`lib/sim/simulate.ts`) — the simulation loop.
5. Assemble `PredictionsPayload` (probabilities + clinch states + per-match projections + bracket).

The payload is cached in **Vercel KV (Upstash Redis)**. `lib/getPredictions.ts` is the shared loader every page uses: read KV, else compute-and-seed. `app/api/cron/recompute` recomputes and writes KV every 30 min (`vercel.json` cron; auth via `CRON_SECRET` as `Authorization: Bearer` or `?secret=` fallback). All pages are `force-dynamic` server components that call `getPredictions()`.

`PRED_KEY` in `lib/kv.ts` is versioned (`predictions:v4`) — **bump it whenever the payload shape changes** so stale cached data is ignored.

### Auth & per-user data (BetterAuth + Neon Postgres)

Login is **magic-link only** (no passwords, no OAuth), via [BetterAuth](https://better-auth.com). Persistent data lives in **Neon Postgres** (`pg` Pool in `lib/db.ts`), which is required — Redis/KV cannot be BetterAuth's primary store.

- `lib/auth.ts` — the BetterAuth instance: `database: pool`, `magicLink` plugin, `trustedOrigins` (localhost + the production domains + Vercel URLs). `sendMagicLink` → `lib/email.ts` (Resend, with a console-log fallback when `RESEND_API_KEY` is unset). Core tables (`user`/`session`/`account`/`verification`) are created by `bun run auth:migrate`.
- `lib/auth-client.ts` — React client (`useSession`, `signIn`, `signOut`); `app/api/auth/[...all]/route.ts` mounts every auth endpoint.
- **Per-user "My Matches"** is the `user_match` table (`user_id`, `match_no`, optional `tickets`/`note`), accessed in `lib/userMatches.ts` (`getSessionUser`, `getUserMatchNumbers`, `getUserMatches`, `setMatchFlag`). Flagging goes through the `toggleMatch` Server Action in `app/actions/matches.ts` (re-checks auth server-side) and the `MatchFlagButton` client component.

**Key design point:** the prediction payload in KV is **global/shared**, so per-user data must NOT live in it. The cached payload holds only `matches` (shared metadata + projections); each page (`/`, `/matches`, `/schedule`, `/bracket`, `/match/[match]`) reads the signed-in user's flagged match numbers from Postgres and joins them to `matches` at request time. The old static `MY_MATCHES` (`lib/data/tickets.ts`) is now only used by the `db:seed-mine` script.

**Deploy (Vercel):** set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (= the production origin, e.g. `https://worldcup2026predictions.app`), `RESEND_API_KEY`, `EMAIL_FROM` in project env. Run `auth:migrate` + `db:init` once against the Neon DB (the same DB serves dev and prod).

### Two distinct notions of certainty (core design principle)

- **Probabilities** come from the Monte Carlo (`sim.teams[code].winGroup`, `.advance`, `.title`, …).
- **Clinch states** come from `lib/sim/clinch.ts` — *exhaustive enumeration* of every remaining scoreline under the real tiebreakers, NOT a sim proxy. A team is "won_group" / "second" / "advanced" / "eliminated" only when mathematically guaranteed.

The UI must **never present a simulation probability as definitive** (no 100%, no ✓ from the sim). Definitive states are sourced from clinch math; everything else stays a probability. `predictions.ts` (the `status` derivation, ~line 139) and `clinch.ts` are deliberately conservative — a tie unresolved except by fair-play/FIFA-ranking is treated as NOT clinched. Knockout slots resolve to a named team only when the feeding group winner/runner-up is clinched (`lockedSlot`); otherwise slots stay projected.

### `lib/sim/*` — pure simulation engine (no I/O, fully unit-tested)

- `simulate.ts` — Monte Carlo loop. Each iteration perturbs every rating by `N(0, 65)` (`RATING_SIGMA`, treats Elo as an estimate, fattens tails). Real ratings are used only as the FIFA-ranking tiebreak proxy.
- `elo.ts` — World-Football Elo: tournament-weighted K, margin-of-victory multiplier, +70 home edge (non-neutral). Replayed matches use `neutral: true`.
- `poisson.ts` — Elo gap → two Poisson goal rates → Dixon-Coles W/D/L and sampled scorelines (needed for GD tiebreakers). `koAdvanceProb()` models regulation + extra time + penalty shootout, memoized and bucketed to 4 Elo for speed.
- `standings.ts` — **2026 FIFA tiebreakers**. The 2026 rule change: head-to-head is applied **before** overall goal difference. Multi-team ties recursively re-apply H2H to still-tied subsets before dropping to overall criteria.
- `thirdPlace.ts` — rank the 12 third-placed teams (no H2H), select best 8, assign them to host slots via the Annex C table.
- `knockout.ts` — resolve the bracket from group outcomes + third assignment, simulate to a champion.
- `hosts.ts` — host-nation advantage, applied only when a host plays in its own country (Mexico gets an extra altitude boost at Azteca/Akron).
- `rng.ts` — seeded `mulberry32` PRNG + gaussian/Poisson samplers. **The whole sim is deterministic given a seed** (default `20260611`).

### `lib/data/*` — verified static data (mostly AUTO-GENERATED — do not hand-edit)

- `teams.ts` — 48 teams, groups, ESPN names, pre-tournament Elo.
- `schedule.ts` — all 104 matches (venues, ET times, group/knockout slots).
- `bracket.ts` — knockout template. **Slot-ref grammar** used across the engine: `1X`/`2X` = winner/runner-up of group X; `3:G1,G2,…` = a third-placed team assigned to this match's host winner-slot; `W##`/`L##` = winner/loser of match ##.
- `thirdPlaceTable.ts` — the verified **495-row Annex C table**. Which group's third fills which winner-slot depends on *which 8 of 12* groups' thirds advance; key = the 8 group letters sorted.
- `tickets.ts` (`MY_MATCHES`), `rules.ts`.

If group/knockout structure ever needs changing, regenerate these rather than editing by hand — they carry "AUTO-GENERATED / verified" headers and have integrity tests in `tests/data.test.ts`.

### Important hardcoded date

`GROUP_STAGE_END = "2026-06-27"` (in `lib/espn.ts`, also referenced in `predictions.ts`) separates group-stage from knockout matches in the ESPN feed. Today's tournament dates start 2026-06-11.

## Routes

- Pages: `/` `/groups` `/bracket` `/schedule` `/matches` (My Matches, per-user) `/methodology` `/match/[match]` `/signin` (magic-link request).
- API: `/api/auth/[...all]` (BetterAuth), `/api/cron/recompute` (cron target), `/api/predictions` (JSON read), `/api/data` (QA ground-truth: fresh source data via `lib/sourceData.ts` + the stored KV payload, so predictions can be checked against source).

## Conventions

- Import alias `@/*` → repo root (`tsconfig.json`).
- UI follows the `ui.sh` design guidelines (see the `design` skill) — stadium-night palette, pitch-green accent, Space Grotesk display font, in `app/globals.css`. shadcn-style components in `components/ui/`.
- `tsconfig.json` excludes `scripts/` and `tests/` from the Next type-check; vitest only includes `tests/**/*.test.ts`.

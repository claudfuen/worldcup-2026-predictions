# World Cup 2026 Predictions

A live Monte Carlo forecast of the 2026 FIFA World Cup. Every team's odds to win its group, advance, reach each knockout round, and lift the trophy, recomputed from real results as the tournament unfolds.

Live at **[worldcup2026predictions.app](https://worldcup2026predictions.app)**.

## What it is

A self-contained statistical model of the 48-team, 12-group 2026 World Cup. It rates every team, simulates the entire remaining tournament 20,000 times, and turns the results into readable odds: title chances, advancement probabilities, group standings, and a projected knockout bracket. There is no sign-in and nothing to configure as a visitor; the whole forecast is free and updates live.

## Features

- **World Football Elo ratings** seeded from ~49,000 international matches and updated after every result, tournament-weighted and scaled by margin of victory, with a host-nation advantage.
- **Poisson / Dixon-Coles scorelines** that map each Elo gap to expected goals, win/draw/loss probabilities, and a full scoreline distribution.
- **20,000-iteration Monte Carlo** over every remaining match, with per-iteration rating uncertainty so the tails stay honest.
- **2026 FIFA tiebreakers** implemented exactly, including the rule change that applies head-to-head before overall goal difference, with recursive resolution of multi-team ties.
- **Verified 495-row FIFA Annex C** third-place assignment: the model selects the 8 best third-placed teams and routes each to the correct Round-of-32 slot in every iteration.
- **Mathematical clinching** that flips an outcome from a probability to a certainty only when no remaining result can overturn it (goal-independent, so it never over-claims).
- **Live results from ESPN**, with in-progress matches surfaced and an "if it ends like this" provisional standings view.
- **Dynamic OG images** (site leaderboard + per-match win-probability cards) for rich social shares.
- **Local-time everywhere**, computed in the viewer's timezone with an ET fallback for clean hydration.

## How it works

The full methodology is documented in-app at **[/methodology](https://worldcup2026predictions.app/methodology)**: ratings, the match model, the simulation, third-place qualification, and how certainty is distinguished from probability. The model backtests at RPS around 0.178 overall (bookmaker-competitive).

The simulation engine is framework-agnostic and lives under `lib/sim/` (Elo, Poisson/Dixon-Coles, 2026 tiebreakers, Annex C third-place assignment, knockout bracket, Monte Carlo). Verified static data (teams + pre-tournament Elo, bracket template, the 495-row table) lives under `lib/data/`. `lib/espn.ts` handles live ingestion and rating replay; `lib/predictions.ts` is the end-to-end pipeline.

## Tech stack

- **Next.js 16** (App Router, React 19, server components, dynamic OG via `next/og`)
- **Tailwind CSS v4** + shadcn-style components, dark theme
- **TypeScript** + **Bun**
- **Vercel** hosting, with **Vercel Cron** driving the recompute
- **Vercel KV** (Upstash Redis REST) for the cached prediction payload
- **Neon Postgres** (only for the optional, dormant auth backend)

## Local development

Requires [Bun](https://bun.sh).

```bash
bun install
cp .env.example .env.local   # fill in values (see below)
bun run dev                  # http://localhost:3000
```

Other scripts: `bun run build`, `bun run typecheck`, `bun run test` (Vitest: tiebreakers, third-place table, bracket, match model, full sim), `bun run lint`.

## Environment variables

Copy `.env.example` to `.env.local`. The app runs with no env vars set (it computes predictions on demand), but KV is strongly recommended.

| Variable | Required | Purpose |
|----------|----------|---------|
| `KV_REST_API_URL` | recommended | Vercel KV / Upstash Redis REST endpoint for the cached prediction payload |
| `KV_REST_API_TOKEN` | recommended | KV REST token |
| `CRON_SECRET` | recommended | Bearer token protecting `/api/cron/recompute` |
| `DATABASE_URL` | optional | Postgres (Neon) for the dormant auth backend; not needed for the open app |
| `RESEND_API_KEY` | optional | Resend key for auth emails (dormant) |
| `EMAIL_FROM` | optional | From address for auth emails (dormant) |

`VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are provided automatically by Vercel.

## Live data and the recompute cron

Predictions are computed by `GET /api/cron/recompute`, which pulls completed results from ESPN's public `fifa.world` feed (no API key), rebuilds ratings, runs the Monte Carlo, and writes the payload to KV. Vercel Cron calls it on a schedule (see `vercel.json`), authenticating with `CRON_SECRET`. Pages read the cached payload; live in-progress scores are fetched per request so they update in real time independently of the cron. The cron stops automatically after the tournament so it does not poll ESPN forever.

## Deploy

Deploys on Vercel out of the box: connect the repo, set the environment variables above, and add a Cron job hitting `/api/cron/recompute`. Any platform that supports Next.js 16 and a scheduled HTTP request will work.

## License

MIT. See [LICENSE](LICENSE).

Live data via ESPN. Not affiliated with FIFA. Ratings and data are for entertainment.

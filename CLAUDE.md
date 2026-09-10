# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("Es una plataforma para jugar online y competir por la mayor cantidad de puntos") — a retro/neon arcade portal built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4, with Supabase as the backend for the game catalog and leaderboards.

The prototype has been migrated: `app/` now holds the real routes, the catalog and scores live in Supabase, and four games (Asteroids, Caída/Tetris, Bloque Buster/Arkanoid, Serpentina/Snake) run on real canvas engines. The rest of the catalog still renders the decorative `.game-arena` placeholder with a "SIMULAR PARTIDA" button.

The specs written so far live in `specs/` and are the canonical record of every decision:

- `01-mvp-pantallas-arcade-vault.md` — migration of the prototype screens into Next.js routes.
- `02-home-page.md` — home page.
- `03-about-page-contact-email.md` — `/acerca-de` + contact form via Resend.
- `04-configuracion-cliente-supabase.md` — Supabase client (browser/server/middleware).
- `05-integrar-juego-asteroides-rocas.md` — the canonical "real engine" pattern (Asteroids).
- `06-leaderboard-catalogo-supabase.md` — catalog + scores moved to Supabase.

Read the relevant spec before touching an area it covers.

No test runner is configured yet. Verification is `npm run build`, `npm run lint`, manual checks, and SQL via the Supabase MCP.

## Commands

- `npm run dev` — dev server (Turbopack).
- `npm run build` / `npm run start` — production build/serve.
- `npm run lint` — ESLint (flat config, `eslint-config-next`).

A `PostToolUse` hook (`.claude/hooks/format-and-lint.cjs`) runs Prettier + ESLint automatically after every Write/Edit, so don't format by hand.

## Styles

Always use the `/frontend-design` skill to design the UI. All visual language lives in `app/globals.css` (~2.8k lines of the neon/retro system: CSS custom properties, `.cover-*` game covers, `.crt-screen`, `.player-hud`, `.game-arena`, `.touch-controls`). Reuse existing classes before adding new ones.

## Architecture

### Routes (`app/`)

- `page.tsx` — home (server component; loads games, recent scores and top players, renders `HomeContent`).
- `games/page.tsx` — catalog/browser (`GamesBrowser`, category filters).
- `juego/[id]/page.tsx` — game detail: description, "Mejor global"/"Partidas", per-game leaderboard.
- `juego/[id]/jugar/page.tsx` — player: HUD (score/lives/level), pause/resume, "FIN DEL JUEGO" modal and score submission. Holds the per-game engine branches (`isAsteroids`, `isCaida`, `isArkanoid`, `isSnake`) with `.game-arena` as fallback.
- `salon-de-la-fama/page.tsx` — hall of fame, tabbed by game.
- `auth/page.tsx` — sign in/up (still local-only: writes `av_user` to `localStorage`, no Supabase Auth).
- `acerca-de/page.tsx` + `api/contact/route.ts` — about page and contact form, sent with Resend.
- `middleware.ts` → `lib/supabase/middleware.ts` — Supabase session refresh on every non-static request.
  See `references/games-catalog.md` when you need to check the games that are implemented and how implement the new ones.

### Data layer (`lib/`)

- `game-types.ts` — `Game`, `GameCategory` (`ARCADE | PUZZLE | SHOOTER | VERSUS`), `GameColor` (`cyan | magenta | green | yellow`), `CATS`. Never invent values outside these enums.
- `games.ts` — reads the `games` table; `best` and `plays` are **always computed** from `scores`, never stored as columns.
- `scores.ts` — leaderboards: `getTopScores`, `getLeaderboardByGame`, `getRecentScores`, `getTopPlayers`.
- `session.ts` — `av_user` in `localStorage` + `saveScore()` inserting into Supabase `scores`.
- `supabase/{client,server,middleware}.ts` — `@supabase/ssr` clients (browser / server component / middleware).

### Components (`components/`)

`Nav`, `HomeContent`, `GamesBrowser`, `GameCard`, `HallOfFameBoard`, and `games/{AsteroidsGame,CaidaGame,ArkanoidGame,SnakeGame}.tsx`.

Every engine is a `"use client"` component following the same contract established by SPEC 05: all state in `useRef`s, one `useEffect` for the RAF loop + listeners with full cleanup, a `paused` prop, an `onHudChange(state)` callback (`score`/`lives`/`level`/`status`), and a `restart()` exposed via `useImperativeHandle`. The engine never shows its own game-over screen or saves scores — it reports upward and the player page handles the modal and `saveScore`.

### Supabase

Project ref `swmezsmuwlavtbdtsstl`, reachable through the `supabase` MCP server (`.mcp.json`). Migrations in `supabase/migrations/`:

- `20260816191454_games_and_scores.sql` — `games` + `scores` tables, RLS with public read and public insert on `scores`, seeded catalog.
- `20260816232257_remove_seed_scores.sql` — removed the fake historical scores on purpose; new leaderboards start empty.

Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.

### References (`references/`)

- `references/templates/` — the original standalone HTML/JSX prototype (hash router + `localStorage`). Still useful as design/behaviour reference, **not** wired into the app. `styles.css` there is the ancestor of `app/globals.css`.
- `references/started-games/` — source games to port (`02-asteroids`, `03-tetris`, `04-arkanoid`).
- `references/snake-assets/` — sprite sources; shipped assets live in `public/games/` (`arkanoid-spritesheet.png`, `snake-fruits.png`, `sounds/`).
- `references/games-catalog.md` — hand-maintained mirror of the Supabase `games` table.
- `references/game-suggestions.md` — persistent memory of the `game-planner` agent: every game suggested, its verdict and why. Read it before proposing a new game; never delete entries.
- `demos/demo.tsx` — scratch demo, not part of the app.

## Agents

Project agents in `.claude/agents/`:

- `game-planner` — decides **which** game should come next. Diagnoses the catalog (category/color balance, missing mechanics, pending `.game-arena` placeholders), picks one winner with reasoning, writes a full `specs/NN-*.md`, and records the decision in `references/game-suggestions.md` so ideas are never re-proposed. It never writes engine code, components or migrations — hand that to `/spec-impl` or `/add-game`.

## Skills

Project skills in `.claude/skills/` (all `disable-model-invocation`, invoke explicitly):

- `/spec` and `/spec-impl` — Spec Driven Design workflow, from https://github.com/Klerith/fernando-skills (`npx skills@latest add Klerith/fernando-skills`). Use `/spec` before any large feature, `/spec-impl` to implement it.
- `/add-game <folder-or-name>` — adds a new playable game end to end: catalog row migration, engine component, wiring into the player route, leaderboard. Use it for any new game or when replacing a `.game-arena` placeholder with a real engine; it encodes the SPEC 05/06 conventions in full.

## Hard rules

- Never store `best`/`plays` as columns, and never hardcode them — derive from `scores`.
- Never seed fake scores into `scores`.
- Never bypass `saveScore` from inside a game engine.
- Never touch an engine or catalog row other than the one you were asked about.

## Important: non-standard Next.js version

Per `AGENTS.md`: this repo pins Next.js 16.2.12, which may have breaking changes relative to your training data. Before writing Next.js-specific code (routing, data fetching, config, etc.), check `node_modules/next/dist/docs/` (organized as `01-app`, `02-pages`, `03-architecture`, `04-community`) for the current APIs and any deprecation notices rather than assuming prior knowledge.

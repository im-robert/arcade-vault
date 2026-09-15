# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault ("Es una plataforma para jugar online y competir por la mayor cantidad de puntos") — a retro/neon arcade portal built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4, with Supabase as the backend for the game catalog and leaderboards.

The prototype has been migrated: `app/` now holds the real routes, the catalog and scores live in Supabase, and five games (Asteroids, Caída/Tetris, Bloque Buster/Arkanoid, Serpentina/Snake, Frogger) run on real canvas engines, each with a selectable neón/retro/clásico skin (`lib/game-skins.ts`). The rest of the catalog (`invasores`, `gloton`, `duelo-pixel`) still renders the decorative `.game-arena` placeholder with a "SIMULAR PARTIDA" button.

The specs written so far live in `specs/` and are the canonical record of every decision:

- `01-mvp-pantallas-arcade-vault.md` — migration of the prototype screens into Next.js routes.
- `02-home-page.md` — home page.
- `03-about-page-contact-email.md` — `/acerca-de` + contact form via Resend.
- `04-configuracion-cliente-supabase.md` — Supabase client (browser/server/middleware).
- `05-integrar-juego-asteroides-rocas.md` — the canonical "real engine" pattern (Asteroids).
- `06-leaderboard-catalogo-supabase.md` — catalog + scores moved to Supabase.
- `07-integrar-juego-invasores.md` — real engine for `invasores` (Borrador/draft, not yet implemented).
- `08-controles-tactiles-movil.md` — touch ergonomics pass for the player route (Aprobado).
- `09-autenticacion-supabase.md` — real Supabase Auth (email/password + Google/GitHub), `profiles` table, `scores.user_id` (Aprobado).
- `10-medidas-seguridad-checklist.md` — security checklist: revoke `EXECUTE` on orphaned `SECURITY DEFINER` functions, HTTP security headers, client-side password length validation, `middleware.ts` → `proxy.ts` (Aprobado).
- `game-jam/` — output of the `game-jam` agent: per-topic subfolders with paired design + implementation specs (e.g. `game-jam/frogger/frogger-core.md`, the spec behind the Frogger engine).

Read the relevant spec before touching an area it covers.

No test runner is configured yet. Verification is `npm run build`, `npm run lint`, manual checks, and SQL via the Supabase MCP.

## Commands

- `npm run dev` — dev server (Turbopack).
- `npm run build` / `npm run start` — production build/serve.
- `npm run lint` — ESLint (flat config, `eslint-config-next`).

A `PostToolUse` hook (`.claude/hooks/format-and-lint.cjs`) runs Prettier + ESLint automatically after every Write/Edit, so don't format by hand.

## Styles

Always use the `/frontend-design` skill to design the UI. All visual language lives in `app/globals.css` (~3.1k lines of the neon/retro system: CSS custom properties, `.cover-*` game covers, `.crt-screen`, `.player-hud`, `.game-arena`, `.touch-controls`). Reuse existing classes before adding new ones.

Per-engine color skins (neón/retro/clásico) are a separate layer on top of this: palettes live in `lib/game-skins.ts` (one `Record<GameSkin, ...Palette>` per engine), selected client-side and persisted via `getStoredSkin`/`setStoredSkin` (`localStorage` key `av_skin`). Add a new engine's palette there, not in `globals.css`.

## Architecture

### Routes (`app/`)

- `page.tsx` — home (server component; loads games, recent scores and top players, renders `HomeContent`).
- `games/page.tsx` — catalog/browser (`GamesBrowser`, category filters).
- `juego/[id]/page.tsx` — game detail: description, "Mejor global"/"Partidas", per-game leaderboard.
- `juego/[id]/jugar/page.tsx` — player: HUD (score/lives/level), pause/resume, "FIN DEL JUEGO" modal and score submission. Holds the per-game engine branches (`isAsteroids`, `isCaida`, `isArkanoid`, `isSnake`, `isFrogger`) with `.game-arena` as fallback.
- `salon-de-la-fama/page.tsx` — hall of fame, tabbed by game.
- `auth/page.tsx` — sign in/up (still local-only: writes `av_user` to `localStorage`, no Supabase Auth).
- `acerca-de/page.tsx` + `api/contact/route.ts` — about page and contact form, sent with Resend.
- `proxy.ts` (Next.js 16's renamed `middleware.ts` convention) → `lib/supabase/middleware.ts` — Supabase session refresh on every non-static request.
  See `references/games-catalog.md` when you need to check the games that are implemented and how implement the new ones.

### Data layer (`lib/`)

- `game-types.ts` — `Game`, `GameCategory` (`ARCADE | PUZZLE | SHOOTER | VERSUS`), `GameColor` (`cyan | magenta | green | yellow`), `CATS`. Never invent values outside these enums.
- `games.ts` — reads the `games` table; `best` and `plays` are **always computed** from `scores`, never stored as columns.
- `scores.ts` — leaderboards: `getTopScores`, `getLeaderboardByGame`, `getRecentScores`, `getTopPlayers`.
- `session.ts` — `av_user` in `localStorage` + `saveScore()` inserting into Supabase `scores`.
- `game-skins.ts` — `GameSkin` (`neon | retro | clasico`) and one palette per real engine (`ASTEROIDS_SKINS`, `SNAKE_SKINS`, `ARKANOID_SKINS`, `FROGGER_SKINS`); `getStoredSkin`/`setStoredSkin` persist the choice in `localStorage`.
- `supabase/{client,server,middleware}.ts` — `@supabase/ssr` clients (browser / server component / middleware).

### Components (`components/`)

`Nav`, `HomeContent`, `GamesBrowser`, `GameCard`, `HallOfFameBoard`, and `games/{AsteroidsGame,CaidaGame,ArkanoidGame,SnakeGame,FroggerGame}.tsx`.

Every engine is a `"use client"` component following the same contract established by SPEC 05: all state in `useRef`s, one `useEffect` for the RAF loop + listeners with full cleanup, a `paused` prop, an `onHudChange(state)` callback (`score`/`lives`/`level`/`status`), and a `restart()` exposed via `useImperativeHandle`. The engine never shows its own game-over screen or saves scores — it reports upward and the player page handles the modal and `saveScore`.

### Supabase

Project ref `swmezsmuwlavtbdtsstl`, reachable through the `supabase` MCP server (`.mcp.json`). Migrations in `supabase/migrations/`:

- `20260816191454_games_and_scores.sql` — `games` + `scores` tables, RLS with public read and public insert on `scores`, seeded catalog.
- `20260816232257_remove_seed_scores.sql` — removed the fake historical scores on purpose; new leaderboards start empty.
- `20260912141638_update_ranaria_to_frogger.sql` — repurposed the existing `ranaria` catalog row into the real Frogger engine (title/short/long/cover/color updated in place; `id` stays `ranaria`, matched by `isFrogger` in the player page).

Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`.

### References (`references/`)

- `references/templates/` — the original standalone HTML/JSX prototype (hash router + `localStorage`). Still useful as design/behaviour reference, **not** wired into the app. `styles.css` there is the ancestor of `app/globals.css`.
- `references/started-games/` — source games to port (`02-asteroids`, `03-tetris`, `04-arkanoid`).
- `references/snake-assets/` — sprite sources; shipped assets live in `public/games/` (`arkanoid-spritesheet.png`, `snake-fruits.png`, `sounds/`).
- `references/gamepad-assets/` — standalone neon gamepad component (`gamepad.html`) used as a design reference for touch/keyboard controls; not wired into the app.
- `references/games-catalog.md` — hand-maintained mirror of the Supabase `games` table.
- `references/game-suggestions.md` — persistent memory of the `game-planner` agent: every game suggested, its verdict and why. Read it before proposing a new game; never delete entries.
- `references/security/security_checklist.md` — hand-maintained snapshot of the security checklist behind SPEC 10; the live source of truth is `mcp__supabase__get_advisors`, not this file.
- `references/security/security-audit-log.md` — persistent, read-only report log of the `security-auditor` agent: every audit run, its findings, classification, and the recommended fix as text (never applied). Read it before auditing again; never delete entries.
- `demos/demo.tsx` — scratch demo, not part of the app.

## Agents

Project agents in `.claude/agents/`:

- `game-planner` — decides which game should come next; diagnoses the catalog and writes the `specs/NN-*.md` for it.
- `game-jam` — runs a 2-way internal game jam on a topic (given or self-chosen), autonomously picking a winner between two proposed specs.
- `mobile-porter` — audits/fixes touch ergonomics of the player route for the real-engine games (SPEC 08).
- `skin-designer` — verifies/implements the neón/retro/clásico skins of a single named game.
- `game-performance-booster` — audits/fixes render/compute performance of a single named real-engine game, never its game logic.
- `security-auditor` — read-only: audits app (headers, validations, auth routes, secrets) and Supabase (RLS, advisors, `SECURITY DEFINER` grants) security, per SPEC 09/10. Never edits code, never writes to the database (`SELECT`-only + advisors); the only file it touches is `references/security/security-audit-log.md`, where recommended fixes are written as text, never applied.

None of these write engine code or migrations outside their stated scope — hand catalog/engine implementation to `/spec-impl` or `/add-game`.

## Skills

Project skills in `.claude/skills/` (all `disable-model-invocation`, invoke explicitly):

- `/spec` and `/spec-impl` — Spec Driven Design workflow, from https://github.com/Klerith/fernando-skills (`npx skills@latest add Klerith/fernando-skills`). Use `/spec` before any large feature, `/spec-impl` to implement it.
- `/spec-impl-game <NN-spec-name>` — same as `/spec-impl`, but for a new-game spec: after implementation it automatically runs `skin-designer` then `mobile-porter`, in sequence.
- `/add-game <folder-or-name>` — adds a new playable game end to end: catalog row migration, engine component, wiring into the player route, leaderboard. Use it for any new game or when replacing a `.game-arena` placeholder with a real engine; it encodes the SPEC 05/06 conventions in full.

## Hard rules

- Never store `best`/`plays` as columns, and never hardcode them — derive from `scores`.
- Never seed fake scores into `scores`.
- Never bypass `saveScore` from inside a game engine.
- Never touch an engine or catalog row other than the one you were asked about.

## Important: non-standard Next.js version

Per `AGENTS.md`: this repo pins Next.js 16.2.12, which may have breaking changes relative to your training data. Before writing Next.js-specific code (routing, data fetching, config, etc.), check `node_modules/next/dist/docs/` (organized as `01-app`, `02-pages`, `03-architecture`, `04-community`) for the current APIs and any deprecation notices rather than assuming prior knowledge.

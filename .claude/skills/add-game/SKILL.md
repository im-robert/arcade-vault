---
name: add-game
description: Adds a new playable game — with a real engine and a Supabase-backed leaderboard — to the Arcade Vault catalog, following the pattern established by SPEC 05 (Asteroids real engine) and SPEC 06 (Supabase catalog/scores). Ports the engine from a folder in references/started-games when one exists, or builds it from scratch when the user brings their own game. Use it whenever the user wants to integrate a new game into the platform, or replace a placeholder ".game-arena" with a real playable engine for a game already in the catalog.
disable-model-invocation: true
argument-hint: "<reference-folder-or-game-name>"
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(ls:*), Bash(npm run build:*), Bash(npm run lint:*), Bash(git status:*), mcp__supabase__apply_migration, mcp__supabase__execute_sql, mcp__supabase__list_tables, mcp__supabase__list_migrations
---

# /add-game — Integrate a new game (engine + Supabase leaderboard)

## Session context

Reference games available to port (folder may or may not match what the user wants):
!`ls references/started-games 2>/dev/null || echo "references/started-games not found"`

Games already ported to a real engine:
!`ls components/games 2>/dev/null || echo "components/games is empty"`

Game category/color enum (do not invent values outside this):
!`cat lib/game-types.ts 2>/dev/null`

Existing Supabase migrations (for naming convention and to see the current `games`/`scores` schema history):
!`ls supabase/migrations 2>/dev/null`

Repository state:
!`git status --short`

---

This skill turns one game into a fully integrated Arcade Vault entry: a catalog row in Supabase, a real playable engine as a React client component, wiring into the player/detail routes, and a working leaderboard — reproducing exactly what SPEC 05 did for Asteroids and what SPEC 06 set up for the catalog/scores tables. Read both specs if they still exist in `specs/` (`05-integrar-juego-asteroides-rocas.md`, `06-leaderboard-catalogo-supabase.md`) before starting — they are the canonical reference for every convention below.

Your replies must be in the same language as the user's request (this repo's specs are written in Spanish; default to Spanish unless the user writes in another language).

## Philosophy

`components/games/AsteroidsGame.tsx` + the `isAsteroids` branch in `app/juego/[id]/jugar/page.tsx` are the **only** working example of a real engine in this codebase. Every other catalog entry is still a decorative `.game-arena` with a "SIMULAR PARTIDA" button that generates a random score. This skill's job is to add one more real engine following that exact shape — not to redesign the player page or the data layer. Minimal diff, same contract, same file layout.

## Phase 1 — Identify the target and its source

1. Determine which game is being integrated and whether `$ARGUMENTS` names:
   - A folder under `references/started-games/` (e.g. `03-tetris`, `04-arkanoid`) → the engine is ported from `game.js`/`index.html`/`style.css` (and `levels.js`, `assets/` if present) in that folder.
   - A game the user is bringing from elsewhere (pasted code, another URL, or "build it from scratch") → no reference folder, the engine is written directly following the target shape in Phase 4.
   - Nothing (`$ARGUMENTS` empty) → ask which game, and whether it comes from `references/started-games` or not.
2. Check whether the game **already exists** in the Supabase `games` table: run `mcp__supabase__execute_sql` with `select id, title, cat, cover, color from games order by id;`.
   - **If it already exists** (e.g. `caida` is the Tetris slot, `bloque-buster` is the Arkanoid slot per SPEC 05's "Out of scope" list) → this is an **engine upgrade**: skip the Supabase insert in Phase 3 entirely, reuse the existing `id`/`title`/`cat`/`cover`/`color`, and go straight to porting the engine (Phase 4) for that existing id.
   - **If it does not exist** → this is a **new catalog entry**: continue to Phase 2 to define its row before touching any code.
3. If porting from a reference folder, read its `game.js` (and `CLAUDE.md`/`README.md` if present — some reference folders, like `04-arkanoid`, carry their own notes) fully before writing anything, so you understand its state shape (score/lives/level or equivalent), input model, and win/lose conditions.

## Phase 2 — Define the catalog row (new entries only)

Skip this phase entirely for an engine upgrade of an existing id.

Ask (in one `AskUserQuestion` block, recommend defaults where obvious from the source game) whatever is not already answerable from context:

- **id**: kebab-case, must not collide with an existing row (checked in Phase 1).
- **title**: display name, uppercase style matching existing entries (`ASTEROIDS`, `INVASORES`, …).
- **cat**: one of `ARCADE | PUZZLE | SHOOTER | VERSUS` (from `lib/game-types.ts` above) — recommend based on the source game's genre.
- **cover**: reuse an existing `.cover-*` class from `app/globals.css` if one already matches the visual theme (e.g. `cover-tetro` for a falling-blocks game, `cover-bricks` for a breakout/arkanoid game — check which existing catalog ids currently hold those classes so you don't collide visually), or flag that a new cover class needs to be added to `app/globals.css` (ask the user for confirmation before inventing new CSS — SPEC 05's decision was to always prefer reuse).
- **color**: one of `cyan | magenta | green | yellow`.
- **short**: one-line tagline.
- **long**: 2-3 sentence description, same tone as existing entries in the seed migration.

Do not ask about `best`/`plays` — per SPEC 06 those are always computed from `scores`, never stored.

## Phase 3 — Insert the catalog row (new entries only)

Skip entirely for an engine upgrade.

1. Write a new migration file `supabase/migrations/<timestamp>_add_game_<id>.sql` (timestamp format matching the existing ones listed in session context) containing a single statement:
   ```sql
   insert into public.games (id, title, short, long, cat, cover, color)
   values ('<id>', '<title>', '<short>', '<long>', '<cat>', '<cover>', '<color>');
   ```
   Do not seed any rows into `scores` — SPEC 06's later migration (`remove_seed_scores.sql`) removed the seeded historical scores on purpose; a new game should start with a genuinely empty leaderboard.
2. Apply it with `mcp__supabase__apply_migration`.
3. Verify with `mcp__supabase__execute_sql`: `select * from games where id = '<id>';` returns the new row.

## Phase 4 — Port the engine into a React component

Create `components/games/<PascalCaseName>Game.tsx` mirroring `AsteroidsGame.tsx` exactly in shape:

```ts
"use client";

export interface <Name>HudState {
  score: number;
  lives: number;   // fixed at a constant (e.g. 1) if the source game has no lives concept — do not omit the field, app/juego/[id]/jugar/page.tsx's HUD always shows it
  level: number;    // fixed at 1 if the source game has no levels
  status: "playing" | "dead" | "gameover"; // map the source game's own states onto these three
}

export interface <Name>GameHandle {
  restart: () => void;
}

interface <Name>GameProps {
  paused: boolean;
  onHudChange: (state: <Name>HudState) => void;
}

// component built with forwardRef<<Name>GameHandle, <Name>GameProps>
```

Rules ported from SPEC 05's decisions — apply them regardless of which game is being ported:

- All engine state (game objects, input, timers, RAF handle) lives in `useRef`s inside the component. No module-level/global mutable state, no injected `<script>`.
- One `useEffect` mounts the loop, attaches keyboard listeners, and returns a cleanup that cancels `requestAnimationFrame` and removes the listeners.
- `<canvas>` keeps the source game's original internal resolution (do not recalculate physics for a responsive canvas) and is drawn at `width: 100%; height: 100%` inside `.crt-screen` — if the original aspect ratio isn't 4:3, flag this to the user before proceeding, since `.crt-screen` is fixed at `aspect-ratio: 4/3` (`app/globals.css`).
- `paused` stops calling `update`/`draw` for that frame and resets the delta-time anchor each paused frame, so resuming doesn't jump.
- `onHudChange` fires every frame with the current HUD state.
- `restart()` is exposed via `useImperativeHandle` and fully reinitializes the engine (equivalent to the source's own init/reset function).
- The engine must **never** self-trigger a restart or its own game-over overlay/UI on death — reaching `status: "gameover"` is reported once via `onHudChange` and the platform's existing "FIN DEL JUEGO" modal takes over (score submission is already wired generically in `app/juego/[id]/jugar/page.tsx` via `saveScore`). Remove/disable any restart-on-keypress or on-canvas game-over screen from the ported source.
- If the source game benefits from touch input, add a row of touch buttons (see `.touch-controls`/`.crt-keys-hint` in `app/globals.css`, already built for Asteroids) using `onTouchStart`/`onTouchEnd`/`onTouchCancel` against the same internal `keys` state the keyboard handler uses — do not add auto-fire beyond whatever cooldown the source engine already has.
- Do not port audio or gamepad support unless the user explicitly asks — out of scope per SPEC 05, same default applies here.

## Phase 5 — Wire it into the player route

In `app/juego/[id]/jugar/page.tsx`:

1. Import the new component.
2. Add a boolean like `isAsteroids` (e.g. `const is<Name> = game?.id === "<id>";`) and extend the render branch (currently `isAsteroids ? <AsteroidsGame .../> : <div className="game-arena">...`) with one more conditional arm for this game, passing `paused`/`onHudChange`/`ref` the same way. Keep the fallback `.game-arena` branch as the default for every id that still has no real engine.
3. Add an `on<Name>Hud` handler analogous to `handleAsteroidsHud`, mapping the component's `HudState` onto the page's existing `score`/`lives`/`level`/`over` state — do not introduce new page-level state fields for this game.
4. Extend `restart()` to also call this game's ref `.restart()`.
5. If this is the game currently controlled by `isAsteroids`-style "SIMULAR PARTIDA" hiding logic (`{!isAsteroids && <button ...>SIMULAR PARTIDA</button>}`), extend that condition so the button also disappears for this game once it has a real engine.
6. If you added a keyboard-controls hint or touch-controls row in Phase 4, render it here conditionally the same way the Asteroids `.crt-keys-hint` is rendered only `{isAsteroids && ...}`.

`app/juego/[id]/page.tsx` (detail page) and `lib/games.ts`/`lib/scores.ts` need **no changes** — they already read any game generically from Supabase and compute `best`/`plays`/leaderboard from `scores` for whatever `game_id` gets inserted, which is exactly why a brand-new `id` immediately gets a working (initially empty) leaderboard once Phase 3's row exists.

## Phase 6 — CSS (only if needed)

- If Phase 2 required a new `.cover-*` class, add it to `app/globals.css` near the existing `cover-*` blocks, matching their structure (`.cover-x`, `.cover-x::before`/`::after` for the decorative layers).
- If Phase 4 added touch controls for a game whose control scheme differs from Asteroids's 4 buttons (◀ ▶ ▲ FUEGO), adjust the touch button layout accordingly, still gated behind `@media (pointer: coarse)`.

## Phase 7 — Verify

Walk through the acceptance checklist adapted from SPEC 05/06 for this game:

- [ ] `/games` shows the card for this game (categoría correcta) — for a new entry; for an engine upgrade, the card already existed and is unchanged.
- [ ] `/juego/<id>` shows its detail screen with "Mejor global"/"Partidas" starting at 0 (new entry) or reflecting real historical data (engine upgrade), and an empty-state leaderboard ("¡SÉ EL PRIMERO!") if `scores` has no rows yet for this id.
- [ ] `/juego/<id>/jugar` renders the real `<canvas>` engine instead of `.game-arena`, and "SIMULAR PARTIDA" is gone for this id.
- [ ] Controls match the source game (keyboard, and touch if added).
- [ ] The HUD (`player-hud`) updates live with real score/lives/level.
- [ ] PAUSA freezes the canvas; REANUDAR continues without a time jump.
- [ ] Losing triggers the "FIN DEL JUEGO" modal with the real score; saving inserts a row into Supabase `scores` (confirm with `mcp__supabase__execute_sql`: `select * from scores where game_id = '<id>' order by created_at desc limit 1;`).
- [ ] That new row is reflected on reload in `/juego/<id>` and in `/salon-de-la-fama`'s tab for this game.
- [ ] "JUGAR DE NUEVO" fully restarts the engine (not just React state).
- [ ] Every other catalog id is unaffected — spot-check one untouched id still shows `.game-arena`.
- [ ] `npm run build` passes with no new errors.

Report the checklist results to the user; do not mark anything done that wasn't actually exercised manually or via SQL.

## Hard rules

- **Never modify an existing engine or catalog row** other than the one being added/upgraded, unless the user explicitly asks.
- **Never store `best`/`plays` as columns** or hardcode them anywhere — always derived from `scores` per SPEC 06.
- **Never seed fake historical scores** for a new game — SPEC 06's later migration explicitly removed that seed data; a new leaderboard starts empty and earns its rows from real play.
- **Never invent a `cat`/`color` value** outside the enums in `lib/game-types.ts` shown in session context.
- **Never bypass the existing score-saving flow** (`saveScore` in `lib/session.ts`, the "FIN DEL JUEGO" modal) — a new engine reports its HUD/game-over state upward, it does not call Supabase directly.
- **Before writing any Next.js-specific code**, check `node_modules/next/dist/docs/` per `AGENTS.md` — this repo pins a non-standard Next.js version.
- If something about the source game (aspect ratio, control scheme, HUD shape) doesn't fit this contract cleanly, stop and ask the user how to resolve it rather than silently deviating from the pattern.

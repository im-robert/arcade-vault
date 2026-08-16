# SPEC 06 — Leaderboard y catálogo de juegos en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 04
> **Date:** 2026-08-16
> **Objective:** Migrar el catálogo de juegos (`lib/data.ts`) y las puntuaciones (`av_scores` en `localStorage`) a dos tablas reales de Supabase (`games` y `scores`), de forma que `/games`, `/juego/[id]`, `/salon-de-la-fama` y la home muestren datos reales en vez de los generados por `seededScores()`/arrays estáticos, manteniendo el guardado de puntuación como invitado (sin login).

## Scope

**In:**

- Nueva migración de Supabase con dos tablas: `games` (catálogo completo: id, title, short, long, cat, cover, color) y `scores` (game_id, player_name, score, created_at), con RLS habilitado: `SELECT` público en ambas, `INSERT` público sin restricciones en `scores` (sin `UPDATE`/`DELETE` — comportamiento _append-only_, equivalente a lo que hoy permite `localStorage` sin login).
- La misma migración siembra `games` con los 8 juegos actuales (mismos valores de `lib/data.ts`: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`) y `scores` con puntuaciones históricas de ejemplo por juego (mismo estilo que genera hoy `seededScores()`: nombres tomados de la lista `PLAYERS` existente, puntuaciones variadas, fechas de 2026) para que el leaderboard no se vea vacío desde el primer despliegue.
- `best` (mejor puntuación) y `plays` (número de partidas) por juego **no** se guardan como columnas — se calculan en cada consulta a partir de `MAX(score)`/`COUNT(*)` agrupado por `game_id` en la tabla `scores`.
- Nuevo `lib/games.ts`: tipo `Game` (mismo shape visual que hoy: id/title/short/long/cat/cover/color/best/plays) + `CATS` (se queda igual, es solo la lista de filtros de UI) + `getGames(): Promise<Game[]>` y `getGame(id): Promise<Game | null>`, usando `lib/supabase/server.ts`.
- Nuevo `lib/scores.ts` con helpers de lectura (server-side, vía `lib/supabase/server.ts`): `getTopScores(gameId, limit)` (leaderboard del detalle de un juego), `getLeaderboardByGame(gameId, limit)` (tabla completa del salón de la fama para un juego/tab), `getRecentScores(limit)` (últimas puntuaciones global, para la home), `getTopPlayers(limit)` (ranking de jugadores por suma de puntuaciones, para la home).
- `lib/session.ts`: `saveScore()` deja de escribir en `localStorage` (`av_scores`) y pasa a hacer un `INSERT` en la tabla `scores` de Supabase (vía `lib/supabase/client.ts`, cliente browser, ya que se dispara desde una interacción del usuario en el reproductor). Se vuelve `async`. `getUser`/`setUser`/`clearUser` (identidad de invitado en `localStorage`) no cambian — fuera de alcance la auth real.
- `lib/data.ts` se elimina: `GAMES`, `PLAYERS`, `seededScores`, `HOME_TICKER`, `HOME_TOP_PLAYERS`, `ScoreRow`, `TickerEntry`, `TopPlayerEntry` quedan reemplazados por lo anterior en `lib/games.ts`/`lib/scores.ts`.
- `app/games/page.tsx` pasa a ser un Server Component `async` que llama a `getGames()` y renderiza un nuevo Client Component `components/GamesBrowser.tsx` (recibe `games: Game[]` como prop) que conserva el estado de búsqueda/chips de categoría que hoy vive en `GamesPage`.
- `app/juego/[id]/page.tsx` (ya es Server Component) cambia `GAMES.find`/`seededScores` por `getGame(id)` + `getTopScores(id, 10)`.
- `app/juego/[id]/jugar/page.tsx` (se mantiene Client Component, ya usa `use(params)`) agrega un `useEffect` que resuelve el `Game` con el cliente browser de Supabase (`lib/supabase/client.ts`) en vez del `GAMES.find` estático; mientras carga, muestra el mismo `notFound()`/estado vacío si no existe el id. El resto del flujo (`SIMULAR PARTIDA`, HUD, `handleSaveScore`) no cambia de comportamiento, solo que `saveScore` ahora es `async` (se espera con `await`/`.then()` antes de `setSaved(true)`).
- `app/salon-de-la-fama/page.tsx` pasa a ser Server Component `async` que llama a `getGames()` (para las tabs) y `getLeaderboardByGame(tabInicial)`; las tabs (cambiar de juego) se mueven a un nuevo Client Component `components/HallOfFameBoard.tsx` que recibe los juegos y hace fetch del leaderboard del tab activo con el cliente browser de Supabase al cambiar de tab (patrón: carga inicial en servidor, recarga de tab en cliente).
- `app/page.tsx` (home) pasa a ser Server Component `async`: reemplaza `GAMES`/`HOME_TICKER`/`HOME_TOP_PLAYERS` estáticos por `getGames()`, `getRecentScores(7)` y `getTopPlayers(5)`. El resto del markup/animaciones (`useReveal`, `FloatingSilhouettes`, etc.) se extraen a un Client Component hijo que recibe esos datos como props, ya que hoy dependen de hooks de cliente (`useEffect`/`IntersectionObserver`).
- `components/GameCard.tsx` actualiza su import de `Game` desde `@/lib/games` en vez de `@/lib/data`.

**Out of scope (for future specs):**

- Autenticación real con Supabase Auth — guardar puntuación sigue sin requerir login, tal como hoy.
- Restringir quién puede insertar en `scores` (rate limiting, validación de puntuaciones sospechosas, RLS basado en usuario autenticado) — el `INSERT` queda abierto, igual de "confiable" que el `localStorage` actual.
- Persistir `av_user` (identidad de invitado) en Supabase — sigue en `localStorage`.
- Implementar el motor real de los 7 juegos que hoy usan `.game-arena` decorativa y "SIMULAR PARTIDA" — siguen generando un score aleatorio en el cliente al pulsar ese botón, pero ese score ahora sí se guarda de verdad en `scores` al terminar la partida.
- Borrar o editar puntuaciones ya guardadas (no hay UI ni política RLS de `DELETE`/`UPDATE`).
- Paginación del salón de la fama o del leaderboard del detalle — se mantiene el mismo límite fijo (10-12 filas) que hoy.
- Tests automatizados.

## Data model

```sql
-- supabase/migrations/xxxx_games_and_scores.sql

create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  player_name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_public_read" on public.games
  for select using (true);

create policy "scores_public_read" on public.scores
  for select using (true);

create policy "scores_public_insert" on public.scores
  for insert with check (true);

-- seed: 8 filas en games (mismos valores que lib/data.ts hoy)
-- seed: ~10-12 filas en scores por juego, nombres de PLAYERS, puntuaciones/fechas variadas
```

```ts
// lib/games.ts
export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number; // MAX(score) de scores para este game_id, 0 si no hay filas
  plays: string; // COUNT(*) de scores para este game_id, formateado (p.ej. "12.4K")
}

export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;

export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | null>;
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa, derivado de created_at
}

export async function getTopScores(
  gameId: string,
  limit?: number,
): Promise<ScoreRow[]>;
export async function getLeaderboardByGame(
  gameId: string,
  limit?: number,
): Promise<ScoreRow[]>;

export interface RecentScoreEntry {
  player: string;
  gameTitle: string;
  score: number;
  color: string; // game.color del juego asociado
  timeAgo: string;
}
export async function getRecentScores(
  limit?: number,
): Promise<RecentScoreEntry[]>;

export interface TopPlayerEntry {
  rank: number;
  player: string;
  totalScore: number; // SUM(score) agrupado por player_name, todas las partidas/juegos
}
export async function getTopPlayers(limit?: number): Promise<TopPlayerEntry[]>;
```

```ts
// lib/session.ts (modificado)
export async function saveScore(entry: {
  game: string;
  score: number;
  name: string;
}): Promise<void>;
// hace INSERT en public.scores { game_id: entry.game, player_name: entry.name, score: entry.score }
```

## Implementation plan

1. Escribir y aplicar (vía MCP `apply_migration`) la migración SQL de arriba: tablas `games`/`scores`, RLS + políticas, seed de los 8 juegos y sus puntuaciones históricas de ejemplo. Verificación: `list_tables` muestra ambas tablas; una query manual `select * from games` devuelve 8 filas y `select count(*) from scores` devuelve un número > 0.
2. Crear `lib/games.ts` con `getGames()`/`getGame()` (usa `lib/supabase/server.ts`, hace el `JOIN`/agregación de `best`/`plays` en la propia consulta o combinando dos queries y reduciendo en JS). Verificación: un script/consulta manual confirma que devuelve los 8 juegos con `best`/`plays` coherentes con las filas sembradas en `scores`.
3. Crear `lib/scores.ts` con los 4 helpers de lectura. Verificación manual equivalente al paso 2.
4. Modificar `lib/session.ts`: `saveScore` pasa a insertar en Supabase vía `lib/supabase/client.ts`, vuelve `async`. Eliminar `AvScoreEntry`/`SCORES_KEY` (ya no se usa `localStorage` para scores).
5. Eliminar `lib/data.ts` y actualizar todos sus imports (`components/GameCard.tsx`, `app/games/page.tsx`, `app/page.tsx`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `app/salon-de-la-fama/page.tsx`) para importar desde `lib/games.ts`/`lib/scores.ts` según corresponda. Verificación: `npm run build` falla mostrando exactamente estos imports rotos hasta completarlos.
6. Convertir `app/games/page.tsx` en Server Component `async` + extraer `components/GamesBrowser.tsx` (Client Component) con la lógica de búsqueda/chips actual. Verificación: `/games` sigue filtrando por texto/categoría igual que antes, ahora con datos reales (bests iniciales = los sembrados en el paso 1).
7. Actualizar `app/juego/[id]/page.tsx` para usar `getGame`/`getTopScores`. Verificación: el detalle de cada uno de los 8 juegos muestra "Mejor global"/"Partidas" reales y el leaderboard lateral con las filas sembradas.
8. Actualizar `app/juego/[id]/jugar/page.tsx`: resolver el juego con el cliente browser en un `useEffect`, y esperar (`await`) `saveScore` antes de marcar `saved`. Verificación: jugar Asteroids (o pulsar "SIMULAR PARTIDA" en cualquier otro juego), guardar la puntuación, y confirmar en Supabase (`execute_sql` o Studio) que apareció la fila nueva en `scores`.
9. Convertir `app/salon-de-la-fama/page.tsx` en Server Component `async` + extraer `components/HallOfFameBoard.tsx` (Client Component con las tabs, que recarga el leaderboard del juego activo vía cliente browser). Verificación: cambiar de tab muestra el leaderboard real de cada juego, incluida la fila nueva guardada en el paso 8 si corresponde a ese juego.
10. Convertir `app/page.tsx` en Server Component `async` + extraer el Client Component con `useReveal`/animaciones, pasándole `games`/`recentScores`/`topPlayers` como props. Verificación: la home muestra el mini-rail de juegos, "ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES" con datos reales de Supabase (incluida la puntuación guardada en el paso 8 apareciendo en el ticker tras refrescar).
11. `npm run build` y recorrido manual completo de las 5 rutas (`/`, `/games`, `/juego/[id]`, `/juego/[id]/jugar`, `/salon-de-la-fama`) confirmando que no quedan referencias a `lib/data.ts` ni a `seededScores`/`localStorage` para puntuaciones, y que no hay errores de consola.

## Acceptance criteria

- [ ] Existen las tablas `games` y `scores` en Supabase, con RLS habilitado y políticas de `SELECT` público en ambas e `INSERT` público solo en `scores`.
- [ ] `games` tiene 8 filas (una por juego del catálogo actual) y `scores` tiene puntuaciones históricas de ejemplo sembradas por la migración.
- [ ] `lib/data.ts` ya no existe; no queda ningún import de `@/lib/data` en el proyecto.
- [ ] `/games` muestra las 8 tarjetas con `best`/`plays` calculados desde `scores` (no hardcodeados), y la búsqueda por texto y los chips de categoría siguen funcionando.
- [ ] `/juego/[id]` muestra "Mejor global"/"Partidas" reales y un leaderboard lateral con filas reales de `scores` para ese juego.
- [ ] Jugar una partida (Asteroids con motor real, o "SIMULAR PARTIDA" en cualquiera de los otros 7) y guardar la puntuación inserta una fila nueva en `scores` en Supabase (verificable con una query directa).
- [ ] Tras guardar una puntuación, esa fila aparece reflejada al recargar en `/juego/[id]` (leaderboard del juego), `/salon-de-la-fama` (tab del juego correspondiente) y en la home ("ÚLTIMAS PUNTUACIONES").
- [ ] `/salon-de-la-fama` muestra el podio y la tabla con datos reales por juego (tabs), sin usar `seededScores()`.
- [ ] Guardar una puntuación no requiere estar autenticado (sigue funcionando como invitado, igual que hoy).
- [ ] La home (`/`) muestra el mini-rail de juegos, "ÚLTIMAS PUNTUACIONES" y "TOP JUGADORES · HOY" con datos reales de Supabase.
- [ ] `npm run build` termina sin errores y no hay errores de consola al navegar las 5 rutas ni al guardar una puntuación.

## Decisions

- **Sí:** se migra el catálogo completo a Supabase (no solo `best`/`plays`) porque el usuario lo pidió explícitamente — `lib/data.ts` deja de ser la fuente de verdad.
- **Sí:** `best`/`plays` se calculan en cada consulta agregando sobre `scores` en vez de mantenerse como columnas actualizadas por trigger — es más simple y evita el riesgo de desincronización, aceptable dado el volumen bajo de datos de este proyecto.
- **Sí:** el leaderboard aplica a los 8 juegos del catálogo, no solo a Asteroids — los 7 juegos sin motor real siguen usando "SIMULAR PARTIDA" para generar un score, pero ese score ahora se persiste de verdad.
- **Sí:** guardar puntuación sigue sin requerir sesión — coherente con que la auth real todavía no existe (SPEC 04 solo dejó el cliente configurado) y con que el modal de "FIN DEL JUEGO" ya pedía solo iniciales, no login.
- **Sí:** la política RLS de `INSERT` en `scores` queda abierta a cualquiera (`anon`), replicando el nivel de confianza que ya tenía `localStorage` (cualquiera podía escribir ahí también) — endurecerla es trabajo de una spec de auth futura.
- **Sí:** se siembra `scores` con datos históricos de ejemplo en la misma migración, para que el leaderboard no debute vacío.
- **Sí:** `/games`, `/juego/[id]` y `/salon-de-la-fama` pasan a ser Server Components que hacen la carga inicial con el cliente server de Supabase, delegando solo la interactividad (búsqueda, chips, tabs) a Client Components hijos — sigue el patrón recomendado por Next.js App Router y ya usado en `app/juego/[id]/page.tsx`.
- **Sí:** `app/juego/[id]/jugar/page.tsx` se queda como Client Component que resuelve el juego con el cliente browser en un `useEffect`, en vez de convertirse en Server Component — ya usa `use(params)` y maneja mucho estado de cliente (HUD, pausa, modal); reestructurarlo por completo queda fuera de alcance de esta spec.
- **Sí:** "TOP JUGADORES" de la home se define como la suma de todas las puntuaciones guardadas por jugador (`SUM(score)` agrupado por `player_name`, sin importar el juego) — es la interpretación más simple que reproduce números "grandes" similares a los del mock actual (`HOME_TOP_PLAYERS`), documentado aquí porque el mock original no explicaba su fórmula.
- **No:** implementar auth real, RLS restrictivo, o migrar `av_user` a Supabase — fuera de alcance, spec futura.
- **No:** dar motor real a los otros 7 juegos — siguen con arena decorativa y "SIMULAR PARTIDA".
- **No:** agregar paginación, borrado o edición de puntuaciones — el leaderboard sigue siendo de solo lectura con límite fijo de filas.

## What is **not** in this spec

- Autenticación real con Supabase Auth (login/signup funcional).
- Restricciones o validación sobre quién/qué puede insertar puntuaciones (anti-cheat, rate limiting).
- Migración de `av_user` (identidad de invitado) a Supabase.
- Motor real para los 7 juegos que hoy usan arena decorativa.
- Paginación, edición o borrado de puntuaciones.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.

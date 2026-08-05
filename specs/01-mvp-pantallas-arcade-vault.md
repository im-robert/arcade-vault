# SPEC 01 — MVP visual de Arcade Vault (migración de pantallas de referencia)

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-08-04
> **Objective:** Migrar las cinco pantallas del prototipo estático en `references/templates/` (biblioteca, detalle, reproductor, autenticación, salón de la fama) a rutas reales de Next.js con Tailwind v4, solo como capa visual sin lógica de juego.

## Scope

**In:**

- Ruta `/` — Biblioteca: hero, buscador, chips de categoría (`CATS`), grilla de `GameCard` con tilt al mouse.
- Ruta `/juego/[id]` — Detalle del juego: portada, tags, descripción, stat-strip (partidas, mejor global, dificultad), tabla de mejores puntuaciones (`seededScores`), botones "Jugar ahora" y "Volver al vault".
- Ruta `/juego/[id]/jugar` — Reproductor: HUD (jugador, puntuación, vidas, nivel), marco CRT decorativo con "enemigos" estáticos, botones Pausa/Fin/Salir, modal de fin de partida con input de iniciales y botón "Guardar puntuación".
- Ruta `/auth` — Autenticación: tabs "Iniciar sesión" / "Crear cuenta", formulario, botón "Jugar como invitado", botones sociales Google/GitHub (decorativos).
- Ruta `/salon-de-la-fama` — Salón de la fama: tabs por juego, podio (oro/plata/bronce), tabla de ranking, fila "tu mejor marca" si hay sesión.
- Componente `Nav` compartido en el layout: logo, links activos, contador de créditos (decorativo), botón de sesión/salir, menú hamburguesa móvil con panel deslizante.
- Migración de `data.jsx` a `lib/data.ts` tipado: `GAMES`, `CATS`, `PLAYERS`, `seededScores()`.
- Sesión mock (`av_user`) y puntuaciones guardadas (`av_scores`) persistidas en `localStorage`, replicando el comportamiento del prototipo (login guarda nombre, logout limpia, guardar puntuación hace push al array).
- Portado del lenguaje visual neón/CRT de `styles.css` (variables de color, tipografía pixel/mono, glow, scanlines, animaciones fade-in/blink/flicker/pulse) a Tailwind v4 usando `@theme` / variables CSS, manteniendo fidelidad al prototipo.
- Botón "Simular partida" (o equivalente) en el reproductor para exponer el modal de fin de juego con una puntuación fija/aleatoria simple, sin bucle de juego real.

**Out of scope (for future specs):**

- Lógica real de cualquiera de los 8 juegos (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel).
- Backend real, base de datos, autenticación real (OAuth Google/GitHub funcional) o API.
- Persistencia de puntuaciones más allá de `localStorage` (ej. sincronización en la nube).
- Sistema de créditos/monedas funcional (el contador del nav queda decorativo).
- Tests automatizados (no hay test runner configurado en el proyecto).
- Internacionalización (todo el contenido queda en español, igual que el prototipo).

## Data model

```ts
// lib/data.ts
export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase css de fondo, ej. "cover-bricks"
  color: GameColor;
  best: number;
  plays: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;
}
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// Estado de sesión y puntuaciones en localStorage (cliente)
// key "av_user"
interface AvUser {
  name: string;
}

// key "av_scores"
interface AvScoreEntry {
  game: string; // id del juego
  score: number;
  name: string;
  at: number; // Date.now()
}
```

Convenciones: mismos nombres de clave (`av_user`, `av_scores`) y misma forma de dato que el prototipo, para que la migración sea 1:1.

## Implementation plan

1. Crear `lib/data.ts` con los tipos y datos migrados de `data.jsx` (`GAMES`, `CATS`, `PLAYERS`, `seededScores`).
2. Portar las variables y clases visuales de `references/templates/styles.css` a `app/globals.css` usando Tailwind v4 (`@theme`), verificando que compile.
3. Crear `components/Nav.tsx` (client component) con logo, links, contador de créditos, botón de sesión leyendo `av_user` de `localStorage`, y menú móvil. Integrarlo en `app/layout.tsx` junto al footer.
4. Crear `lib/session.ts` con helpers `getUser`, `setUser`, `clearUser`, `saveScore` sobre `localStorage`, reutilizados por Nav, Auth y Player.
5. Implementar `app/page.tsx` (Biblioteca) con `GameCard`, buscador y chips de categoría, usando `GAMES`/`CATS` de `lib/data.ts`.
6. Implementar `app/juego/[id]/page.tsx` (Detalle) con portada, info, stat-strip y leaderboard vía `seededScores`.
7. Implementar `app/auth/page.tsx` con tabs, formulario mock, botón invitado y botones sociales decorativos, usando `lib/session.ts` para loguear y redirigir a `/`.
8. Implementar `app/juego/[id]/jugar/page.tsx` (Reproductor) con HUD, marco CRT estático, botón "Simular partida" que fija una puntuación y abre el modal de fin de juego, y guardado de puntuación vía `lib/session.ts`.
9. Implementar `app/salon-de-la-fama/page.tsx` con tabs por juego, podio y tabla, incluyendo la fila "tu mejor marca" cuando hay sesión activa.
10. Revisión visual cruzada contra `references/templates/Arcade Vault.html` en el navegador para ajustar detalles de estilo (glow, spacing, responsive del nav móvil).

## Acceptance criteria

- [ ] `/` muestra la grilla de 8 juegos, el buscador filtra por título y los chips filtran por categoría.
- [ ] Click en una `GameCard` navega a `/juego/[id]` con los datos correctos del juego.
- [ ] `/juego/[id]` muestra el leaderboard de 10 filas generado por `seededScores`.
- [ ] Botón "Jugar ahora" en detalle navega a `/juego/[id]/jugar`.
- [ ] En el reproductor, el botón "Simular partida" abre el modal de fin de juego con una puntuación visible.
- [ ] Guardar puntuación en el modal escribe una entrada nueva en `localStorage["av_scores"]` y muestra el toast "Puntuación guardada".
- [ ] `/auth` permite iniciar sesión (guarda `av_user` en `localStorage` y redirige a `/`) y jugar como invitado (limpia sesión y redirige a `/`).
- [ ] El Nav muestra "Iniciar Sesión" sin sesión y el nombre de usuario con opción de salir cuando hay sesión activa.
- [ ] `/salon-de-la-fama` muestra podio (top 3) y tabla completa por juego seleccionado, con tabs funcionales.
- [ ] Con sesión activa, `/salon-de-la-fama` muestra la fila "tu mejor marca" al final de la tabla.
- [ ] El menú hamburguesa en mobile abre/cierra el panel lateral y permite navegar a las 5 rutas.
- [ ] La app compila sin errores de consola en las 5 rutas.

## Decisions

- **Sí:** rutas reales con App Router (`/`, `/juego/[id]`, `/juego/[id]/jugar`, `/auth`, `/salon-de-la-fama`) en vez de hash-router, porque es el patrón idiomático de Next.js y da URLs compartibles.
- **No:** router basado en query params en una sola página. Menos idiomático y complica el layout compartido (Nav).
- **Sí:** `localStorage` para sesión y puntuaciones, igual que el prototipo, porque no hay backend en este MVP y mantiene fidelidad de comportamiento.
- **No:** estado solo en memoria. Se perdería la sesión al recargar, alejándose del comportamiento del prototipo que el usuario pidió replicar.
- **Sí:** el reproductor muestra el HUD/CRT sin bucle de juego automático; se agrega un botón "Simular partida" para poder ver el flujo de fin de partida y guardado de puntuación sin implementar un juego real.
- **No:** replicar el `setInterval` que sube el score automáticamente. Es lógica de "juego", explícitamente fuera de scope.
- **Sí:** portar fielmente `styles.css` (paleta neón, CRT, tipografía pixel/mono) a Tailwind v4, en vez de reinterpretar el estilo con `/frontend-design` desde cero, para mantener consistencia con el prototipo ya validado.
- **Sí:** incluir elementos decorativos sin funcionalidad real (botones sociales, contador de créditos) tal cual el prototipo, para mantener fidelidad visual del MVP.
- **Sí:** migrar `data.jsx` a `lib/data.ts` tipado en TypeScript como fuente única de datos mock para todas las pantallas.

## What is **not** in this spec

- Lógica jugable de los 8 juegos del catálogo.
- Backend, base de datos o autenticación real (OAuth funcional).
- Sistema de créditos/monedas funcional.
- Tests automatizados.
- Sincronización de puntuaciones fuera de `localStorage`.

Cada uno de estos, si se implementa, va en su propio spec.

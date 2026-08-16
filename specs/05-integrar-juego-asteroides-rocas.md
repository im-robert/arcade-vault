# SPEC 05 — Agregar el juego ASTEROIDS al catálogo

> **Status:** Implementado
> **Depends on:** —
> **Date:** 2026-08-16
> **Objective:** Agregar una nueva entrada "ASTEROIDS" al catálogo (`lib/data.ts`) y portar el motor de `references/started-games/02-asteroids/game.js` a un componente React (`components/games/AsteroidsGame.tsx`) que reemplace la arena decorativa del reproductor en `/juego/asteroids/jugar`, con HUD, pausa y guardado de puntuación reales, más controles táctiles para pantallas de toque.

## Scope

**In:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "asteroids"`, `title: "ASTEROIDS"`, `cat: "SHOOTER"`, reutilizando el cover visual existente `cover-rocas` (ya tiene la estética de asteroides en `app/globals.css`) y `color: "yellow"` (mismos valores visuales que la entrada `rocas` existente, que queda intacta y sin relación con esta nueva entrada). `short`/`long`/`best`/`plays` con textos y números nuevos coherentes con el resto del catálogo (best/plays arbitrarios tipo placeholder, igual que las demás entradas).
- Nuevo componente client-only `components/games/AsteroidsGame.tsx` con el motor completo del juego (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, loop, colisiones, niveles, power-up de disparo triple) adaptado del `game.js` original, sin variables globales ni `<script>` externo — todo el estado del motor vive dentro del componente (refs), inicializado y limpiado en un `useEffect` (cancela el `requestAnimationFrame` y remueve listeners de teclado al desmontar).
- El componente expone:
  - Prop `paused: boolean` — cuando es `true`, el loop deja de correr `update`/`draw` (la pantalla queda congelada en el último frame) y no acumula `dt` de más al reanudar.
  - Prop `onHudChange(state: { score: number; lives: number; level: number; status: "playing" | "dead" | "gameover" }) => void` — invocado cada frame con los valores actuales del motor.
  - Un `ref` con método imperativo `restart()` que reinicia el motor por completo (equivalente a `initGame()` del original).
- El motor se modifica respecto al original en un solo punto: en estado `gameover` ya no reacciona a `Space` para reiniciar (eso lo dispara ahora exclusivamente el botón "JUGAR DE NUEVO" del modal vía `restart()`); el resto de la lógica de juego (movimiento, disparo, colisiones, split de asteroides, power-up 3x, vidas, niveles) se porta sin cambios de balance.
- El `<canvas>` mantiene resolución interna fija 800×600 (misma física/velocidades que el original) pero se dibuja a `width: 100%; height: 100%` dentro de `.crt-screen`, que ya tiene `aspect-ratio: 4/3` — coincide exactamente con 800:600, así que escala sin distorsión ni recorte.
- `app/juego/[id]/jugar/page.tsx` se modifica para: cuando `game.id === "asteroids"`, renderizar `<AsteroidsGame>` dentro de `.crt-screen` en lugar del `.game-arena` decorativo (divs `grid-floor`/`enemy`/`player-ship`); para el resto de los ids (incluyendo `rocas`, que sigue siendo un placeholder sin implementar), `.game-arena` decorativo se mantiene igual que hoy.
- El HUD superior (`player-hud`) deja de usar `score`/`lives`/`level` simulados por el botón "SIMULAR PARTIDA" (ese botón se elimina solo para `asteroids`) y en su lugar refleja los valores reales recibidos vía `onHudChange`.
- Botón "PAUSA"/"REANUDAR" pasa a controlar la prop `paused` del motor real (antes solo mostraba un overlay visual sin detener nada).
- Cuando `onHudChange` reporta `status === "gameover"`, se muestra el modal `FIN DEL JUEGO` ya existente (mismo flujo de guardar iniciales vía `saveScore({ game: "asteroids", score, name })`); "JUGAR DE NUEVO" llama a `restart()` del motor (no solo resetea el state de React) y "VOLVER AL VAULT" navega a `/games` como hoy.
- Controles táctiles: fila de 4 botones (`◀`, `▶`, `▲`, `FUEGO`) debajo de `.crt`, ocultos por CSS (`@media (pointer: coarse)`) — visibles solo en dispositivos táctiles. Cada botón usa `touchstart`/`touchend` para mantener presionada la tecla virtual correspondiente (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`) exactamente igual que mantener la tecla física — sin auto-disparo añadido más allá del que ya tiene el motor original (cooldown de 0.2s + `Space` de un solo disparo por pulsación).
- Texto de controles de teclado (`← → ROTAR · ↑ PROPULSAR · ESPACIO DISPARAR`) visible en `.crt-bottom` o similar, siempre (no solo táctil).

**Out of scope (for future specs):**

- La entrada existente `rocas` y los otros 6 juegos del catálogo (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — siguen usando `.game-arena` decorativo sin motor real. `rocas` no se toca, no se fusiona ni se elimina en esta spec.
- Persistir puntuaciones en Supabase — `saveScore()` sigue escribiendo en `localStorage` (`av_scores`) igual que hoy, sin usar los helpers de `lib/supabase/*` de SPEC 04.
- Leaderboard por juego / actualizar `game.best` en `lib/data.ts` con el score real jugado — esos números siguen siendo estáticos.
- Sonido / efectos de audio.
- Guardar high scores globales del juego Asteroids en sí (el original no los tenía; solo se agrega guardado vía el modal existente).
- Ajustar el balance de dificultad, velocidades o puntos del juego respecto al original.
- Soporte de gamepad/mando.
- Tests automatizados.

## Data model

```ts
// lib/data.ts — nueva entrada agregada a GAMES
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Pulveriza asteroides en gravedad cero.",
  long: "Tu nave triangular flota en el vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Sobrevive oleada tras oleada y persigue el power-up de disparo triple.",
  cat: "SHOOTER",
  cover: "cover-rocas",
  color: "yellow",
  best: 38200,
  plays: "0",
}
```

```ts
// components/games/AsteroidsGame.tsx

export interface AsteroidsHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface AsteroidsGameHandle {
  restart: () => void;
}

interface AsteroidsGameProps {
  paused: boolean;
  onHudChange: (state: AsteroidsHudState) => void;
}

// componente con forwardRef<AsteroidsGameHandle, AsteroidsGameProps>
```

No se agregan tablas ni claves nuevas de `localStorage` — se reutiliza `saveScore`/`AvScoreEntry` de `lib/session.ts` (SPEC existente), pasando `game: "asteroids"`.

## Implementation plan

1. Agregar la nueva entrada `{ id: "asteroids", title: "ASTEROIDS", ... }` a `GAMES` en `lib/data.ts` según el modelo de datos de arriba. Verificación: `/games` muestra la nueva tarjeta "ASTEROIDS" y `/juego/asteroids` muestra su detalle (con la arena decorativa todavía, hasta el paso 7).
2. Crear `components/games/AsteroidsGame.tsx` con `"use client"`, un `<canvas>` de 800×600 y el esqueleto: `useEffect` que monta el loop y limpia al desmontar, sin lógica de juego todavía (solo fondo negro). Verificación manual: renderizando el componente de forma aislada se ve un canvas negro.
3. Portar las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y las funciones de utilidad (`wrap`, `dist`, `rand`, `randInt`) dentro del componente (o en un módulo interno del mismo archivo), operando sobre `ctx` obtenido del `canvasRef`. Verificación: sigue compilando, canvas sigue negro (las clases no se usan aún).
4. Portar el estado del motor (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`, etc.) a refs internas del componente, junto con `initGame`, `nextLevel`, `explode`, `killShip`, `spawnAsteroids`, `update(dt)`, `draw()` y el loop `requestAnimationFrame`. Input (`keys`, `justPressed`, listeners de teclado) también vive en refs, agregados/removidos en el mismo `useEffect`. Verificación manual: el juego es jugable con teclado igual que el original (`npx serve references/started-games/02-asteroids` como referencia de comparación).
5. Quitar del motor portado la rama que reinicia con `Space` en estado `gameover` (bloque `if (state === 'gameover') { if (pressed('Space')) initGame(); ... }` pasa a solo actualizar partículas, sin reiniciar).
6. Agregar `onHudChange` — se llama al final de cada `update`/frame con `{ score, lives, level, status: state }`. Agregar `paused` — si es `true`, el frame no llama `update(dt)` ni recalcula `dt` contra el tiempo real (reinicia `lastTime` cada frame pausado para no acumular salto al reanudar) y tampoco redibuja.
7. Exponer `restart()` vía `useImperativeHandle` que llama a la misma lógica de `initGame()` y notifica el nuevo estado con `onHudChange`.
8. Modificar `app/juego/[id]/jugar/page.tsx`: si `game.id === "asteroids"`, renderizar `<AsteroidsGame ref={...} paused={paused} onHudChange={...} />` en vez de `.game-arena`; los `useState` de `score`/`lives`/`level` se actualizan desde `onHudChange`; se elimina el botón "SIMULAR PARTIDA" y su handler `simulateGame` (solo para el caso `asteroids`; los demás juegos no cambian); el botón PAUSA sigue alternando el mismo `paused` que ahora sí congela el motor; cuando `status === "gameover"` se dispara `setOver(true)`; `handleSaveScore` sigue llamando `saveScore({ game: game.id, score, name })`; "JUGAR DE NUEVO" llama a `restartRef.current?.restart()` además de `restart()` de React (resetear `over`/`saved`).
9. Agregar en `app/globals.css` los estilos de la fila de controles táctiles (4 botones, ocultos por defecto y visibles solo con `@media (pointer: coarse)`) y del texto de controles de teclado en `.crt-bottom`.
10. Implementar en `AsteroidsGame.tsx` los 4 botones táctiles con `onTouchStart`/`onTouchEnd` (y `onTouchCancel`) que setean/limpian las mismas entradas del objeto `keys` interno usado por `Ship.update`/`tryShoot`.
11. Prueba manual completa: jugar una partida entera con teclado desde `/juego/asteroids/jugar` (mover, disparar, romper asteroides, subir de nivel, perder las 3 vidas), confirmar que el HUD de React refleja score/vidas/nivel en tiempo real, que PAUSA congela el juego, que al morir 3 veces aparece el modal con el score real, que guardar la puntuación la agrega a `av_scores` en `localStorage`, y que "JUGAR DE NUEVO" arranca una partida nueva desde cero. Repetir con un dispositivo/emulador táctil para confirmar que los 4 botones controlan la nave. Confirmar además que `/juego/rocas/jugar` y el resto de los juegos siguen mostrando la arena decorativa sin cambios.

## Acceptance criteria

- [ ] `/games` muestra una tarjeta "ASTEROIDS" (categoría SHOOTER) y `/juego/asteroids` muestra su pantalla de detalle con el botón "JUGAR AHORA".
- [ ] `/juego/asteroids/jugar` muestra un `<canvas>` con el juego Asteroids real (nave, asteroides, disparo, power-up 3x) en vez de la arena decorativa con divs.
- [ ] Las flechas izquierda/derecha rotan la nave, la flecha arriba propulsa, y espacio dispara — igual que en `references/started-games/02-asteroids`.
- [ ] Los asteroides grandes se dividen en medianos y estos en pequeños al ser destruidos, sumando 20/50/100 puntos respectivamente (mismos valores que el original).
- [ ] El HUD superior (`player-hud`) muestra el score, las vidas y el nivel reales del juego, actualizándose mientras se juega.
- [ ] El botón "PAUSA" congela el juego (no se mueve nada en el canvas) y "REANUDAR" lo continúa sin saltos de tiempo perceptibles.
- [ ] El botón "SIMULAR PARTIDA" ya no existe en `/juego/asteroids/jugar`.
- [ ] Al perder las 3 vidas se muestra el modal "FIN DEL JUEGO" con la puntuación real obtenida.
- [ ] Ingresar iniciales y pulsar "GUARDAR PUNTUACIÓN" agrega una entrada `{ game: "asteroids", score, name }` a `av_scores` en `localStorage`.
- [ ] "JUGAR DE NUEVO" cierra el modal y arranca una partida completamente nueva (score en 0, 3 vidas, nivel 1, asteroides reiniciados).
- [ ] "VOLVER AL VAULT" navega a `/games`.
- [ ] En una pantalla táctil (o emulada en devtools con "touch simulation"), aparecen 4 botones (◀ ▶ ▲ FUEGO) debajo del `.crt` que controlan la nave manteniéndolos presionados; en un mouse/desktop normal esos botones no son visibles.
- [ ] `/juego/rocas/jugar` y los demás 6 juegos del catálogo siguen mostrando la arena decorativa sin cambios, sin relación con la nueva entrada `asteroids`.
- [ ] La app compila (`npm run build`) y no hay errores de consola al jugar una partida completa.

## Decisions

- **Sí:** se agrega una entrada nueva `asteroids` al catálogo en vez de reutilizar/renombrar la entrada existente `rocas`, por pedido explícito del usuario — son juegos conceptualmente distintos en el catálogo aunque compartan temática visual.
- **Sí:** la nueva entrada reutiliza la clase CSS `cover-rocas` ya existente para su cover (misma estética de asteroides en fondo oscuro), en vez de crear un cover nuevo, ya que visualmente encaja y evita CSS duplicado. Si el usuario prefiere un cover distinto, es un ajuste menor posterior.
- **Sí:** el motor se porta dentro de un componente React (refs + `useEffect`), no como `<script src="game.js">` inyectado, para evitar variables globales y que el juego se limpie correctamente al salir de la página (cancelar RAF, quitar listeners).
- **Sí:** se usa el tamaño interno fijo 800×600 del canvas escalado por CSS a `.crt-screen` (que ya es 4:3), en vez de recalcular física/velocidades para un canvas responsive — mantiene el balance del juego original intacto y es la opción más simple.
- **Sí:** el "game over" se maneja con el modal React ya existente en vez del overlay propio del canvas (`drawOverlay('GAME OVER', ...)`), para reusar el flujo de guardado de puntuación de la plataforma y no duplicar UI. El overlay propio del motor deja de dibujarse en ese estado.
- **Sí:** se agregan controles táctiles (mantener presionado, no toque discreto) porque el juego debe ser jugable en móvil y el original solo soportaba teclado; se ocultan en desktop vía `pointer: coarse` para no ensuciar el layout ahí.
- **No:** hacer el canvas responsive con recálculo de coordenadas — el escalado CSS 1:1 de aspecto ya resuelve el ajuste visual sin tocar la lógica de colisiones/movimiento.
- **No:** portar audio, gamepad, ni persistencia de high scores propia del juego — el guardado de puntuación ya lo cubre el modal existente vía `saveScore`.
- **No:** tocar la entrada `rocas` ni los otros 6 juegos del catálogo, ni migrar `saveScore`/`getUser` a Supabase — fuera de alcance, seguirá en `localStorage` hasta una spec futura de persistencia real.

## What is **not** in this spec

- La entrada `rocas` y los demás 6 juegos del catálogo (siguen siendo arena decorativa).
- Persistencia de puntuaciones en Supabase.
- Leaderboard dinámico o actualización de `game.best`/`game.plays` con datos reales.
- Audio y soporte de gamepad.
- Cambios al balance/dificultad del juego original.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.

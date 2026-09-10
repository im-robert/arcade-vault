# Historial de sugerencias de juegos

Memoria del agente `game-planner`. Cada entrada registra un juego propuesto, su veredicto y por qué. El agente lee este archivo **antes** de proponer nada y lo actualiza al terminar.

Estados: `Sugerido` (propuesto, sin veredicto) · `Aceptado` (aprobado, ya en el catálogo pero sin motor real) · `Descartado` (evaluado y rechazado) · `Implementado` (en el catálogo y con motor real).

| Fecha      | ID              | Título     | Categoría | Color   | Estado       | Spec                                          |
| ---------- | --------------- | ---------- | --------- | ------- | ------------ | --------------------------------------------- |
| 2026-08-16 | `asteroids`     | ASTEROIDS  | SHOOTER   | yellow  | Implementado | `specs/05-integrar-juego-asteroides-rocas.md` |
| 2026-08-16 | `caida`         | TETRIS     | PUZZLE    | magenta | Implementado | —                                             |
| 2026-08-16 | `bloque-buster` | ARKANOID   | ARCADE    | cyan    | Implementado | —                                             |
| 2026-08-16 | `serpentina`    | SNAKE      | ARCADE    | green   | Implementado | —                                             |
| 2026-08-16 | `invasores`     | INVADERS   | SHOOTER   | green   | Sugerido     | `specs/07-integrar-juego-invasores.md`        |
| 2026-08-16 | `ranaria`       | FROG       | ARCADE    | green   | Aceptado     | —                                             |
| 2026-08-16 | `gloton`        | GLUTTON    | ARCADE    | yellow  | Aceptado     | —                                             |
| 2026-08-16 | `duelo-pixel`   | PIXEL DUEL | VERSUS    | cyan    | Aceptado     | —                                             |
| 2026-09-06 | `pila-neon`     | NEON STACK | PUZZLE    | magenta | Descartado   | —                                             |
| 2026-09-06 | `carrera-neon`  | NEON RUN   | ARCADE    | magenta | Descartado   | —                                             |

---

## asteroids — ASTEROIDS

- **Fecha:** 2026-08-16
- **Estado:** Implementado
- **Categoría / Color:** SHOOTER / yellow
- **Complejidad:** M
- **Mecánica:** nave con inercia que pulveriza asteroides que se parten al recibir impacto.
- **Por qué encaja:** primer motor real de la plataforma; define el contrato de motores de SPEC 05.
- **Veredicto:** implementado en `components/games/AsteroidsGame.tsx`.
- **Spec:** `specs/05-integrar-juego-asteroides-rocas.md`

## caida — TETRIS

- **Fecha:** 2026-08-16
- **Estado:** Implementado
- **Categoría / Color:** PUZZLE / magenta
- **Complejidad:** M
- **Mecánica:** piezas que caen y se encajan para completar líneas.
- **Por qué encaja:** único representante de `PUZZLE` en el catálogo.
- **Veredicto:** implementado en `components/games/CaidaGame.tsx`.
- **Spec:** —

## bloque-buster — ARKANOID

- **Fecha:** 2026-08-16
- **Estado:** Implementado
- **Categoría / Color:** ARCADE / cyan
- **Complejidad:** M
- **Mecánica:** paleta y pelota que destruyen muros de ladrillos.
- **Por qué encaja:** mecánica de rebote/paleta, distinta a todo lo demás del catálogo.
- **Veredicto:** implementado en `components/games/ArkanoidGame.tsx` con spritesheet en `public/games/`.
- **Spec:** —

## serpentina — SNAKE

- **Fecha:** 2026-08-16
- **Estado:** Implementado
- **Categoría / Color:** ARCADE / green
- **Complejidad:** S
- **Mecánica:** serpiente que crece al comer y muere al morderse.
- **Por qué encaja:** mecánica de crecimiento sobre rejilla; motor barato y muy legible.
- **Veredicto:** implementado en `components/games/SnakeGame.tsx` con sprites de fruta.
- **Spec:** —

## invasores — INVADERS

- **Fecha:** 2026-08-16 · revisado 2026-09-06
- **Estado:** Sugerido (en el catálogo, spec redactada, motor pendiente)
- **Categoría / Color:** SHOOTER / green
- **Complejidad:** M
- **Mecánica:** filas de alienígenas que descienden mientras el jugador dispara desde abajo.
- **Por qué encaja:** segundo `SHOOTER` del catálogo, con patrón de oleadas en vez de campo abierto.
- **Veredicto:** **Ganador de la ronda 2026-09-06.** Elegido como próximo motor real frente a `ranaria`, `gloton` y `duelo-pixel`: mejor relación valor/coste (score entero acumulativo ideal para el leaderboard, cero assets nuevos, portada `cover-invaders` ya existente en `app/globals.css`, y reutiliza casi entero el vocabulario técnico de SPEC 05 — proyectiles, AABB, oleadas, vidas). Además refuerza `SHOOTER`, la categoría con 2 entradas y un solo motor. No lleva migración: la fila ya está seedeada.
- **Spec:** `specs/07-integrar-juego-invasores.md`

## ranaria — FROG

- **Fecha:** 2026-08-16
- **Estado:** Aceptado
- **Categoría / Color:** ARCADE / green
- **Complejidad:** M
- **Mecánica:** cruzar carriles de tráfico esquivando obstáculos en movimiento.
- **Por qué encaja:** aporta la familia "esquivar/cruzar", ausente entre los motores reales.
- **Veredicto:** en el catálogo desde el seed inicial, todavía con placeholder `.game-arena`. Pendiente de motor real. **Perdió la ronda 2026-09-06** frente a `invasores`: su puntuación es por cruce completado (escalonada y poco discriminante para un ranking global) y el río con troncos añade una segunda física —plataformas móviles con arrastre— que no reutiliza nada de lo ya escrito.
- **Spec:** —

## gloton — GLUTTON

- **Fecha:** 2026-08-16
- **Estado:** Aceptado
- **Categoría / Color:** ARCADE / yellow
- **Complejidad:** L
- **Mecánica:** devorar puntos en un laberinto huyendo de perseguidores.
- **Por qué encaja:** aporta laberinto + IA de persecución, la familia más ausente del catálogo.
- **Veredicto:** en el catálogo desde el seed inicial, todavía con placeholder `.game-arena`. El más caro de los pendientes por la IA de los fantasmas y el diseño del laberinto. **Perdió la ronda 2026-09-06** frente a `invasores`: complejidad L (laberinto, pathfinding sobre rejilla, cuatro IAs con personalidad distinta y modo píldora). Merece su propia spec cuando haya menos deuda pendiente.
- **Spec:** —

## duelo-pixel — PIXEL DUEL

- **Fecha:** 2026-08-16
- **Estado:** Aceptado
- **Categoría / Color:** VERSUS / cyan
- **Complejidad:** S
- **Mecánica:** dos paletas, una pelota, al estilo Pong.
- **Por qué encaja:** único `VERSUS` del catálogo.
- **Veredicto:** en el catálogo desde el seed inicial, todavía con placeholder `.game-arena`. Decisión pendiente: cómo se guarda un score de leaderboard en una partida de dos jugadores locales. **Perdió la ronda 2026-09-06** frente a `invasores` precisamente por eso: sin esa decisión de producto (¿solo el ganador puntúa? ¿solo el modo CPU?) no se puede cerrar una spec sin inventar reglas.
- **Spec:** —

## pila-neon — NEON STACK

- **Fecha:** 2026-09-06
- **Estado:** Descartado
- **Categoría / Color:** PUZZLE / magenta
- **Complejidad:** S
- **Mecánica:** bloques que se deslizan en horizontal y se apilan; lo que sobresale del bloque anterior se recorta hasta que la torre se vuelve imposible.
- **Por qué encaja:** sería el segundo `PUZZLE` del catálogo (hoy solo `caida`) y el motor más barato posible.
- **Veredicto / por qué se descartó:** sería una novena fila en `games` mientras cuatro ids siguen sin motor real. El hueco actual es de implementación, no de ideas. Reconsiderar solo cuando no queden placeholders `.game-arena`.
- **Spec:** —

## carrera-neon — NEON RUN

- **Fecha:** 2026-09-06
- **Estado:** Descartado
- **Categoría / Color:** ARCADE / magenta
- **Complejidad:** M
- **Mecánica:** corredor lateral de scroll infinito que salta obstáculos a velocidad creciente.
- **Por qué encaja:** aporta la familia "endless runner", ausente del catálogo, y un score por distancia perfectamente acumulativo.
- **Veredicto / por qué se descartó:** mismo motivo que `pila-neon` — añadir catálogo nuevo con cuatro placeholders pendientes. Además `ARCADE` ya es la categoría más poblada (4 de 8), así que ni siquiera tapa el hueco de balance.
- **Spec:** —

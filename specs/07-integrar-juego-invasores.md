# SPEC 07 — Integrar el motor real de INVADERS (`invasores`)

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-09-06
> **Objetivo:** Reemplazar el placeholder `.game-arena` del id `invasores` por un motor real de canvas 2D (`components/games/InvadersGame.tsx`) que siga el contrato de motores de SPEC 05 y alimente el leaderboard de Supabase de SPEC 06.

## Por qué existe esta spec

El catálogo tiene 8 juegos y solo 4 motores reales (`asteroids`, `caida`, `bloque-buster`, `serpentina`). Los otros 4 ids (`invasores`, `ranaria`, `gloton`, `duelo-pixel`) siguen renderizando la arena decorativa con el botón "SIMULAR PARTIDA": son deuda visible, porque el usuario entra a `/juego/invasores/jugar` y no juega nada.

Antes de inventar un juego nuevo hay que pagar esa deuda, y `invasores` es la pieza que menos cuesta y más rinde: reutiliza casi entero el vocabulario técnico que ya resolvió SPEC 05 con Asteroids (proyectiles, colisiones AABB, oleadas, vidas), no necesita ningún asset nuevo en `public/games/`, y su portada `cover-invaders` ya existe en `app/globals.css` dibujada con gradientes. Además equilibra `SHOOTER`, la categoría con 2 entradas y un único motor real.

## Alcance

**Dentro:**

- Nuevo componente client-only `components/games/InvadersGame.tsx` con el motor completo escrito desde cero (no hay fuente en `references/started-games/`), respetando el contrato de SPEC 05: todo el estado del motor en `useRef`, un único `useEffect` con el bucle `requestAnimationFrame` y los listeners de teclado, con cleanup completo al desmontar.
- Prop `paused: boolean`: congela `update`/`draw` en el último frame y no acumula `dt` al reanudar.
- Prop `onHudChange(state: InvadersHudState) => void`: reporta `score`, `lives`, `level` y `status` hacia la página del reproductor.
- `restart()` expuesto con `useImperativeHandle`, que reinicia el motor por completo (oleada 1, score 0, vidas iniciales).
- Mecánica: formación rectangular de alienígenas que se desplaza en horizontal, baja un escalón al tocar un borde y acelera a medida que quedan menos vivos; el cañón del jugador se mueve en horizontal y dispara hacia arriba; los alienígenas de la fila inferior sueltan proyectiles hacia abajo; búnkeres destructibles entre el jugador y la formación; nave nodriza ocasional cruzando por la parte superior con bonus.
- Puntuación: entero acumulativo. Los alienígenas valen más cuanto más arriba está su fila; la nave nodriza da un bonus fijo; despejar una oleada suma un bonus de oleada. No hay puntos negativos ni multiplicadores fraccionarios — el score que llega a `scores` es siempre un entero.
- Condiciones de fin: perder todas las vidas, o que la formación alcance la altura del cañón (game over inmediato, sin descontar vidas de una en una).
- Progresión de niveles: al despejar la formación, `level` sube y la siguiente oleada arranca más abajo, más rápida y con mayor cadencia de disparo enemigo. Los búnkeres se regeneran al subir de nivel.
- Canvas de resolución interna fija **800×600**, dibujado a `width: 100%; height: 100%` dentro de `.crt-screen` (que ya tiene `aspect-ratio: 4/3`), igual que Asteroids: escala sin distorsión.
- Estética exclusivamente con primitivas de canvas y los tokens de color del sistema neón (`--green` para los alienígenas, `--cyan` para el cañón y sus disparos, `--magenta` para la nave nodriza), sin cargar ninguna imagen.
- `app/juego/[id]/jugar/page.tsx`: añadir la rama `isInvaders` (`game?.id === "invasores"`) junto a las existentes — renderiza `<InvadersGame>` dentro de `.crt-screen`, se excluye del bloque "SIMULAR PARTIDA" y añade su línea `.crt-keys-hint` (`← → MOVER · ESPACIO DISPARAR`).
- Controles táctiles: fila de 3 botones (`◀`, `▶`, `FUEGO`) con el patrón `.touch-controls` ya usado por los otros motores, con `touchstart`/`touchend` mapeados a `ArrowLeft`, `ArrowRight` y `Space`.
- Guardado de puntuación: exclusivamente por el flujo existente de la página del reproductor (modal "FIN DEL JUEGO" → `saveScore`). El motor **nunca** llama a `saveScore` ni pinta su propia pantalla de game over.

**Fuera (para specs futuras):**

- Los otros tres placeholders: `ranaria`, `gloton` y `duelo-pixel` siguen con `.game-arena` decorativo. Sus filas no se tocan.
- Cualquier cambio en la fila `invasores` de la tabla `games` (`title`, `short`, `long`, `cat`, `cover`, `color`) — se usan tal cual están. Esta spec no lleva migración SQL.
- Sonido y efectos de audio (existe `public/games/sounds/`, pero queda para una spec de audio transversal).
- Sprites o spritesheet para los alienígenas: la primera versión se dibuja con primitivas.
- Power-ups del jugador (disparo múltiple, escudo).
- Soporte de gamepad.
- Tests automatizados.

## Modelo de datos

La fila del catálogo **ya existe** en la tabla `games` y no se modifica. Es la referencia para el motor:

```ts
{
  id: "invasores",
  title: "INVADERS",
  short: "Defiende el planeta de filas alienígenas.",
  long: "Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.",
  cat: "SHOOTER",
  cover: "cover-invaders",
  color: "green",
}
```

`best` y `plays` se derivan de `scores` (SPEC 06). No se añaden columnas ni se insertan filas de puntuación.

Contrato del componente, idéntico en forma al de SPEC 05:

```ts
// components/games/InvadersGame.tsx

export interface InvadersHudState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface InvadersGameHandle {
  restart: () => void;
}

interface InvadersGameProps {
  paused: boolean;
  onHudChange: (state: InvadersHudState) => void;
}
```

Estado interno del motor (todo en refs, nunca en `useState`):

```ts
// forma del estado interno
{
  cannon: { x, y, w, h, speed },
  aliens: [/* { x, y, w, h, row, alive } */],
  formation: { dx, stepDown, speed, direction },
  playerShots: [/* { x, y, vy } */],
  alienShots: [/* { x, y, vy } */],
  bunkers: [/* { x, y, cells: Uint8Array } */],
  mothership: null /* | { x, y, vx, points } */,
  score, lives, level, status,
}
```

Convenciones: origen arriba-izquierda; velocidades en píxeles por segundo escaladas por `dt`; colisiones por AABB.

## Plan de implementación

Cada paso deja la app compilando y funcionando.

1. **Esqueleto del componente.** Crear `components/games/InvadersGame.tsx` con el canvas 800×600, el bucle RAF, la prop `paused`, `onHudChange` y `restart()` vacío de lógica pero con el contrato completo y el cleanup del `useEffect`.
2. **Cañón y disparo del jugador.** Movimiento horizontal con límites, disparo con cooldown, listeners de teclado, dibujado con `--cyan`.
3. **Formación de alienígenas.** Generación de la rejilla, desplazamiento lateral, escalón al tocar borde, aceleración según el número de vivos, colisión disparo-alienígena y puntuación por fila.
4. **Fuego enemigo y vidas.** Disparos desde los alienígenas más bajos de cada columna, colisión con el cañón, estado `dead` con respawn breve y decremento de vidas; `gameover` al agotarlas o al llegar la formación a la línea del cañón.
5. **Búnkeres y nave nodriza.** Búnkeres destructibles por celdas (erosión en ambos sentidos) y nave nodriza periódica con bonus.
6. **Oleadas.** Al despejar la formación: bonus de oleada, `level + 1`, formación más baja/rápida y búnkeres regenerados.
7. **Cableado del reproductor.** Añadir `isInvaders` en `app/juego/[id]/jugar/page.tsx`: rama de render dentro de `.crt-screen`, exclusión del botón "SIMULAR PARTIDA", `.crt-keys-hint` y los 3 botones táctiles.
8. **Verificación.** `npm run lint` y `npm run build`; partida manual completa: jugar, pausar, morir, guardar score y comprobar que aparece en `/juego/invasores` y en `/salon-de-la-fama`.
9. **Documentación.** Actualizar `references/games-catalog.md` si hace falta reflejar que `invasores` ya tiene motor real, y marcar el estado de la memoria en `references/game-suggestions.md`.

## Criterios de aceptación

- [ ] `/juego/invasores/jugar` renderiza un `<canvas>` jugable dentro de `.crt-screen` y ya no muestra el `.game-arena` decorativo ni el botón "SIMULAR PARTIDA".
- [ ] `←`/`→` mueven el cañón sin salirse del canvas; `Espacio` dispara respetando el cooldown.
- [ ] La formación baja un escalón al tocar un borde y acelera a medida que quedan menos alienígenas vivos.
- [ ] Un disparo del jugador destruye exactamente un alienígena y suma puntos según su fila; las filas superiores valen más.
- [ ] Un impacto enemigo o de la formación reduce las vidas del HUD en 1 y el motor pasa por `status: "dead"` antes de volver a `"playing"`.
- [ ] Los búnkeres se erosionan tanto con disparos del jugador como con los enemigos.
- [ ] La nave nodriza aparece periódicamente y otorga un bonus fijo al ser derribada.
- [ ] Despejar la formación incrementa `level` en el HUD y lanza una oleada más difícil con los búnkeres regenerados.
- [ ] El HUD (`score`, `lives`, `level`) refleja los valores reales del motor en tiempo real vía `onHudChange`.
- [ ] "PAUSA" congela el juego y "REANUDAR" lo retoma sin salto de tiempo por `dt` acumulado.
- [ ] Con las vidas a 0 (o formación en la línea del cañón) aparece el modal "FIN DEL JUEGO"; guardar iniciales inserta la fila en `scores` con `game_id = "invasores"` y un `score` entero.
- [ ] "JUGAR DE NUEVO" llama a `restart()` y reinicia score, vidas, nivel y oleada.
- [ ] El motor no llama a `saveScore` ni dibuja su propia pantalla de game over.
- [ ] Desmontar la página cancela el `requestAnimationFrame` y remueve todos los listeners (sin warnings en consola).
- [ ] En pantallas táctiles aparecen los botones `◀ ▶ FUEGO` y funcionan igual que las teclas.
- [ ] No se añaden archivos nuevos a `public/games/`.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones

**Sí:**

- **Motor real para un id ya existente antes que un juego nuevo.** Hay 4 placeholders en el catálogo; añadir una novena entrada agrandaría la deuda en vez de reducirla.
- **`invasores` como ganador.** Es el placeholder con mejor relación valor/coste: score acumulativo natural para el leaderboard, cero assets nuevos, portada ya diseñada, y refuerza `SHOOTER` (2 entradas, 1 motor).
- **Sin migración SQL.** La fila ya está seedeada con `cat`, `cover` y `color` correctos; tocarla sería trabajo gratis y riesgo innecesario.
- **Dibujo con primitivas, no sprites.** Los alienígenas de cuadros neón encajan con el sistema visual existente y evitan cargar un spritesheet como el de Arkanoid.
- **Game over inmediato si la formación llega al cañón.** Es la regla del arcade original y evita el estado ambiguo de "formación encima del jugador con vidas restantes".

**No:**

- **`ranaria` (FROG).** Su puntuación es por cruce completado, mucho más escalonada y menos discriminante para un ranking global; además el río con troncos añade una segunda física (plataformas móviles con arrastre) que no reutiliza nada de lo ya escrito.
- **`gloton` (GLUTTON).** Complejidad L: hay que diseñar el laberinto, el pathfinding sobre rejilla y cuatro IAs con personalidades distintas más el modo píldora. Es el motor más caro del catálogo; merece su propia spec cuando haya menos deuda pendiente.
- **`duelo-pixel` (PIXEL DUEL).** Tiene una decisión de producto sin resolver: qué score se guarda en una partida local de dos jugadores. Mientras no se decida (¿se guarda solo el ganador? ¿el modo CPU es el único que puntúa?), no se puede escribir una spec cerrada sin inventar reglas.
- **Un juego nuevo fuera del catálogo (p. ej. un runner o un shoot'em up vertical).** Añadiría una novena fila mientras cuatro siguen sin motor; la memoria del planificador ya deja claro que el hueco es de implementación, no de ideas.
- **Audio en esta spec.** El sistema de sonido debe ser transversal a los 5 motores, no específico de INVADERS.

## Lo que **no** entra en esta spec

- Motores para `ranaria`, `gloton` o `duelo-pixel`.
- Migraciones SQL, filas nuevas en `games`, o cualquier score de prueba en `scores`.
- Cambios en `app/globals.css` más allá de lo estrictamente necesario para la rama del reproductor (se reutilizan `.crt-screen`, `.player-hud`, `.crt-keys-hint`, `.touch-controls`).
- Cambios en `lib/scores.ts`, `lib/games.ts` o `lib/session.ts`.
- Sonido, sprites, power-ups, gamepad y tests automatizados.

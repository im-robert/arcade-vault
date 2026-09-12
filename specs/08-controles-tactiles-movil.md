# SPEC 08 — Pulir la experiencia táctil del reproductor en móvil

> **Estado:** Aprobado
> **Depende de:** SPEC 05
> **Fecha:** 2026-09-10
> **Objetivo:** Pulir la ergonomía táctil y el soporte de orientación del reproductor (`app/juego/[id]/jugar`) para los 4 juegos con motor real, sin rediseñar la disposición de botones que ya existe.

## Por qué existe esta spec

Los 4 motores reales (`asteroids`, `caida`, `bloque-buster`, `serpentina`) ya implementan controles táctiles siguiendo el patrón `.touch-controls`/`.touch-btn` de `app/globals.css`, activado con `@media (pointer: coarse)`. Funcionalmente responden al tacto, pero nunca se validaron en un dispositivo físico ni se pensó su comportamiento en pantallas angostas (portrait) o con el teclado virtual abierto. Esta spec no añade controles nuevos: corrige ergonomía (tamaño táctil), soporte de ambas orientaciones y el modal de fin de partida, que hoy pueden fallar en un teléfono real como el Samsung S22 sobre el que se va a verificar.

## Alcance

**Dentro:**

- Las 4 rutas de reproductor con motor real: `/juego/asteroids/jugar`, `/juego/caida/jugar`, `/juego/bloque-buster/jugar`, `/juego/serpentina/jugar`.
- Tamaño y ergonomía de los botones dentro de `.touch-controls` (`app/globals.css`): garantizar un área táctil mínima real de 44×44px en cualquier ancho de pantalla, ajustando `.touch-controls .touch-btn` y sus breakpoints existentes (`max-width: 720px`, `@media (pointer: coarse)`) o añadiendo uno nuevo si hace falta para anchos menores a ~380px.
- Soporte de **ambas orientaciones** (portrait y landscape) para las 4 rutas: en landscape angosto (poca altura), el HUD (`.player-hud`) y `.touch-controls` no deben ocupar tanta altura que dejen el `.crt-screen` inutilizable; se ajusta con un nuevo bloque `@media (max-height: ...) and (pointer: coarse)` si el análisis inicial lo confirma necesario.
- Los botones `PAUSA`/`SALIR` (y el selector de skin, en los juegos que lo tienen) dentro de `.hud-actions`: garantizar que cumplan el mismo mínimo táctil de 44px de alto en pantallas táctiles, **sin cambiar su posición actual** (se quedan en `.player-hud`, arriba).
- El modal "FIN DEL JUEGO" (`app/juego/[id]/jugar/page.tsx`): el input de iniciales debe permanecer visible por encima del teclado virtual al enfocarlo, mediante `scrollIntoView` en el `onFocus` del input.
- Verificación en dos etapas: emulación táctil en Chrome DevTools (viewport Galaxy S22, ~360×780) durante la implementación, y verificación manual final en un Samsung S22 físico, en portrait y landscape.

**Fuera (para specs futuras):**

- Los 4 placeholders sin motor real (`invasores` ya tiene motor por SPEC 07; `ranaria`, `gloton`, `duelo-pixel` siguen con `.game-arena` y "SIMULAR PARTIDA") — un botón normal ya funciona con tap, no se tocan.
- El resto del sitio fuera del reproductor: `Nav`, home, `/games`, `/juego/[id]` (detalle) y `/salon-de-la-fama` — no entran en esta auditoría.
- Bloquear o forzar una orientación (p. ej. overlay "gira tu dispositivo") — se decidió soportar ambas orientaciones en vez de restringir.
- Rediseñar cuántos botones tiene cada juego o cómo se agrupan — se mantiene la disposición actual de cada motor, solo se pule tamaño/estilo/ergonomía.
- Reubicar `PAUSA`/`SALIR` fuera de `.player-hud` o duplicarlos dentro de `.touch-controls`.
- Soporte de gamepad o teclados Bluetooth.
- Tests automatizados (no hay runner configurado en el proyecto).

## Modelo de datos

Esta spec no introduce estructuras de datos nuevas. Es exclusivamente CSS (`app/globals.css`) y un ajuste de comportamiento de foco en `app/juego/[id]/jugar/page.tsx` (ref + `scrollIntoView`); no toca `lib/`, Supabase, ni el contrato de props de los motores (`paused`/`onHudChange`/`restart`).

## Plan de implementación

1. **Auditoría inicial.** Con Chrome DevTools en modo emulación táctil (viewport Galaxy S22, 360×780 portrait y 780×360 landscape), recorrer las 4 rutas de reproductor y el modal "FIN DEL JUEGO", documentando los gaps concretos encontrados (botones recortados, tamaño insuficiente, HUD/controles comiéndose el canvas en landscape, input tapado por el teclado). Este paso no cambia código, solo confirma qué ajustar en los pasos siguientes.
2. **Tamaño táctil mínimo.** Ajustar `.touch-controls .touch-btn` en `app/globals.css` para garantizar ≥44×44px de área táctil real en cualquier ancho, revisando los breakpoints existentes y añadiendo uno específico para anchos <380px si el paso 1 lo confirma necesario.
3. **Landscape angosto.** Si el paso 1 confirma que `.player-hud` + `.touch-controls` dejan el `.crt-screen` inutilizable en landscape de poca altura, añadir un bloque `@media (max-height: ...) and (pointer: coarse)` que reduzca paddings/tamaños de esos dos bloques sin tocar el canvas ni la disposición de botones.
4. **Botones del HUD superior.** Verificar y, si hace falta, ajustar en `app/globals.css` que `.btn` dentro de `.hud-actions` (PAUSA/SALIR/selector de skin) cumpla ≥44px de alto en pantallas táctiles, sin mover su posición.
5. **Input de iniciales vs. teclado virtual.** En `app/juego/[id]/jugar/page.tsx`, añadir un `ref` al `<input>` de iniciales dentro del modal y un handler `onFocus` que llame `scrollIntoView({ behavior: "smooth", block: "center" })`.
6. **Verificación en DevTools.** Repetir la auditoría del paso 1 en las 4 rutas y el modal, confirmando que los gaps documentados quedaron resueltos.
7. **Verificación final en dispositivo físico.** El usuario prueba en su Samsung S22 real, portrait y landscape, los 4 juegos completos (mover con controles táctiles, pausar, perder, guardar puntuación con el input de iniciales) y marca los criterios de aceptación.

## Criterios de aceptación

- [ ] En los 4 juegos (`asteroids`, `caida`, `bloque-buster`, `serpentina`), cada botón dentro de `.touch-controls` mide al menos 44×44px de área táctil real en el Samsung S22, tanto en portrait como en landscape.
- [ ] Ningún botón de `.touch-controls` queda recortado o fuera de la pantalla en ninguna de las dos orientaciones.
- [ ] El canvas de cada uno de los 4 juegos permanece visible y jugable (sin recorte severo) tanto en portrait como en landscape en el Samsung S22.
- [ ] Los botones `PAUSA`/`SALIR` (y el selector de skin, cuando aplica) en `.hud-actions` son fácilmente tocables (≥44px de alto) sin haber cambiado su posición actual.
- [ ] Al enfocar el input de iniciales en el modal "FIN DEL JUEGO", el campo permanece visible por encima del teclado virtual en el Samsung S22.
- [ ] Es posible jugar una partida completa (mover, pausar, perder, guardar puntuación) usando solo controles táctiles, sin teclado físico, en los 4 juegos, en ambas orientaciones.
- [ ] `npm run build` y `npm run lint` pasan sin errores nuevos respecto al estado antes de esta spec.

## Decisiones

**Sí:**

- **Soportar portrait y landscape**, en vez de forzar una orientación con un overlay de "gira tu dispositivo" — decisión explícita del usuario; implica más trabajo de layout pero no bloquea al jugador.
- **Mantener la disposición actual de botones por juego** — esta spec pule tamaño/estilo/ergonomía, no rediseña cuántos botones hay ni cómo se agrupan en cada motor.
- **Resolver el teclado virtual tapando el input con `scrollIntoView` en `onFocus`** — solución mínima y localizada, en vez de reestructurar el modal completo o depender de `interactive-widget` en el viewport.
- **Verificación final en dispositivo físico (Samsung S22)** como último paso, usando DevTools solo como herramienta de iteración intermedia más rápida.
- **PAUSA/SALIR se quedan en `.player-hud`** — solo se garantiza su tamaño táctil mínimo, no se duplican ni se mueven junto a `.touch-controls`.

**No:**

- **Tocar los 4 placeholders** (`ranaria`, `gloton`, `duelo-pixel` sin motor real, más `invasores` que ya tiene motor por SPEC 07 pero no es parte de esta spec) — un botón normal ("SIMULAR PARTIDA") ya funciona con tap, no hay nada que pulir ahí.
- **Auditar el resto del sitio** (nav, home, catálogo, salón de la fama) — se decidió acotar esta spec estrictamente al reproductor.
- **Bloquear/forzar orientación** — descartado a favor de soportar ambas.
- **Rediseñar la disposición de botones por juego** — fuera de alcance según la decisión del usuario.

## Lo que **no** entra en esta spec

- Los 4 juegos sin motor real (`ranaria`, `gloton`, `duelo-pixel`) y el motor de `invasores` (SPEC 07, ya resuelto aparte).
- Nav, home, `/games`, `/juego/[id]` (detalle) y `/salon-de-la-fama`.
- Bloqueo o forzado de orientación de pantalla.
- Rediseño de la cantidad o agrupación de botones táctiles por juego.
- Reubicación de `PAUSA`/`SALIR` fuera de `.player-hud`.
- Soporte de gamepad o teclado físico Bluetooth.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propia spec.

# SPEC 02 — Home page (landing) y reubicación de la Biblioteca

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-08-07
> **Objective:** Migrar la pantalla Home del prototipo en `references/templates/home-about/` a la ruta `/`, moviendo la Biblioteca actual (hoy en `/`) a `/games` y actualizando el Nav y todos los enlaces internos en consecuencia.

## Scope

**In:**

- Nueva ruta `/` — Home: hero con eyebrow "INSERTA UNA MONEDA", título de 3 líneas, subtítulo, CTAs "EXPLORAR JUEGOS" / "CREAR CUENTA", silueta pixel flotante decorativa (`FloatingSilhouettes`), scroll hint.
- Sección "¿POR QUÉ ARCADE VAULT?" con 4 `feature-card` (Juegos Clásicos, 100% Gratis, Ladder Boards, Siempre Creciendo) e íconos pixel SVG inline.
- Sección "JUEGOS DISPONIBLES AHORA" con `mini-rail` de los primeros 6 juegos de `GAMES`, cada uno navegando a `/juego/[id]`, y botón "VER TODOS LOS JUEGOS →" a `/games`.
- Sección de estadísticas (`home-stats`): 3 bloques con los textos fijos del prototipo ("12+ JUEGOS Y CONTANDO", "MILES DE PARTIDAS JUGADAS CADA DÍA", "GLOBAL RANKING COMPITE CON EL MUNDO").
- Sección "ACTIVIDAD EN VIVO": tarjeta de "últimas puntuaciones" (ticker) y tarjeta "top jugadores · hoy" con enlace "VER SALÓN →" a `/salon-de-la-fama`.
- Sección de precios ("PRECIOS"): tarjeta de plan único gratuito con lista de beneficios, botón "EMPEZAR GRATIS →" a `/auth`, y bloque de FAQ (3 preguntas/respuestas, contenido estático).
- CTA final ("¿LISTO PARA JUGAR?") con botón "INSERTAR MONEDA →" a `/games`.
- Animación de aparición al hacer scroll (`reveal` + `IntersectionObserver`) para las secciones, igual que el prototipo.
- Mover el contenido actual de `app/page.tsx` (Biblioteca: hero, buscador, chips, grilla) a la nueva ruta `app/games/page.tsx`, sin cambios funcionales.
- Actualizar `components/Nav.tsx`: agregar link "Inicio" (`/`), cambiar el link "Biblioteca" para apuntar a `/games`, y ajustar `isActive` para distinguir Home de Biblioteca (Biblioteca activa en `/games` y `/juego/*`).
- Actualizar todos los enlaces/redirecciones internas que hoy apuntan a `/` esperando la Biblioteca, para que apunten a `/games`:
  - `app/auth/page.tsx`: redirección tras login y tras "jugar como invitado".
  - `app/salon-de-la-fama/page.tsx`: botón inferior de volver.
  - `app/juego/[id]/page.tsx`: botón "Volver al vault".
  - `app/juego/[id]/jugar/page.tsx`: botón "Salir".
  - El logo del Nav sigue apuntando a `/` (ahora Home), sin cambios.
- Portar a `app/globals.css` los bloques CSS de `references/templates/home-about/styles.css` correspondientes a Home (`.home`, `.home-hero*`, `.home-silos`, `.home-title`, `.home-section`, `.feature-grid`/`.feature-card`, `.mini-rail`/`.mini-card`, `.home-stats`/`.stat-*`, `.activity-grid`/`.ticker`/`.top-list`, `.pricing-grid`/`.price-card`/`.faq-item`, `.home-final`, `.reveal`), **sin** portar los bloques de `/* ===== ABOUT PAGE ===== */` (quedan fuera de scope).
- Agregar a `lib/data.ts` los datos mock de la sección "ACTIVIDAD EN VIVO" del Home: `HOME_TICKER` (últimas puntuaciones) y `HOME_TOP_PLAYERS` (ranking del día), tipados, tal como aparecen hardcodeados en `home.jsx`.

**Out of scope (for future specs):**

- Página "Acerca de" (`about.jsx`) y su formulario de contacto con la pantalla de éxito estilo terminal — queda para un spec futuro.
- Cualquier lógica real detrás de "ACTIVIDAD EN VIVO" (websockets, polling, backend) — sigue siendo contenido mock estático.
- Sistema de créditos/monedas funcional (sigue decorativo, sin cambios respecto al spec 01).
- Tests automatizados.

## Data model

```ts
// lib/data.ts — agregado a lo ya definido en SPEC 01

export interface TickerEntry {
  p: string; // nombre del jugador
  g: string; // nombre del juego
  s: number; // puntuación
  t: string; // texto relativo, ej. "hace 2 min"
  c: GameColor | "magenta" | "yellow" | "green" | "cyan"; // color del acento
}
export const HOME_TICKER: TickerEntry[];

export interface TopPlayerEntry {
  r: number; // ranking (1-based)
  p: string; // nombre del jugador
  s: number; // puntuación
}
export const HOME_TOP_PLAYERS: TopPlayerEntry[];
```

Convención: mismos valores que los arrays hardcodeados en `references/templates/home-about/home.jsx` (secciones `ÚLTIMAS PUNTUACIONES` y `TOP JUGADORES · HOY`), solo movidos a `lib/data.ts` para centralizar el mock data junto con `GAMES`.

## Implementation plan

1. Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (Biblioteca), sin modificaciones funcionales.
2. Agregar `HOME_TICKER` y `HOME_TOP_PLAYERS` (tipados) a `lib/data.ts`, migrando los valores desde `home.jsx`.
3. Portar los bloques CSS de Home (excluyendo Acerca de) desde `references/templates/home-about/styles.css` a `app/globals.css`.
4. Reescribir `app/page.tsx` como la pantalla Home: hero, siluetas flotantes, secciones "por qué", mini-rail de juegos, stats, actividad en vivo (usando `HOME_TICKER`/`HOME_TOP_PLAYERS`), precios/FAQ y CTA final, con el hook `useReveal` (IntersectionObserver) para las animaciones de scroll.
5. Actualizar `components/Nav.tsx`: agregar link "Inicio" → `/`, cambiar destino de "Biblioteca" a `/games`, y separar `isActive` en `home` (`pathname === "/"`) y `biblioteca` (`pathname === "/games" || pathname.startsWith("/juego")`). Replicar en el panel móvil.
6. Actualizar redirecciones/enlaces en `app/auth/page.tsx`, `app/salon-de-la-fama/page.tsx`, `app/juego/[id]/page.tsx` y `app/juego/[id]/jugar/page.tsx` para apuntar a `/games` en vez de `/`.
7. Revisión visual cruzada contra `references/templates/home-about/arcade-vault-standalone.html` (o el HTML equivalente) en el navegador, verificando el flujo completo: Home → Biblioteca → Detalle → Reproductor → Salón → Auth, y que ningún enlace quede roto.

## Acceptance criteria

- [ ] `/` muestra la pantalla Home completa (hero, por qué, juegos disponibles, stats, actividad en vivo, precios/FAQ, CTA final).
- [ ] `/games` muestra la Biblioteca (buscador, chips, grilla) exactamente como antes en `/`.
- [ ] El Nav muestra "Inicio" y "Biblioteca" como links separados; "Inicio" está activo en `/` y "Biblioteca" está activo en `/games` y en `/juego/*`.
- [ ] En Home, click en una `MiniCard` navega a `/juego/[id]` correspondiente.
- [ ] En Home, "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`.
- [ ] En Home, "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] En Home, "VER SALÓN →" navega a `/salon-de-la-fama`.
- [ ] Las secciones marcadas `reveal` aparecen con animación de fade/slide al hacer scroll hasta ellas.
- [ ] Tras iniciar sesión o jugar como invitado en `/auth`, la app redirige a `/games`.
- [ ] El botón de volver en `/salon-de-la-fama`, "Volver al vault" en `/juego/[id]` y "Salir" en `/juego/[id]/jugar` navegan a `/games`.
- [ ] El logo del Nav sigue navegando a `/` (Home) desde cualquier pantalla.
- [ ] La app compila sin errores de consola en `/` y `/games`.

## Decisions

- **Sí:** Home vive en `/` y la Biblioteca se mueve a `/games`, replicando fielmente la estructura de navegación del template de referencia (`Inicio · Biblioteca · Salón de la Fama · Acerca de`), en vez de poner Home en una ruta secundaria.
- **No:** dejar la Biblioteca en `/` y mover Home a otra ruta (ej. `/inicio`). Se descartó porque no coincide con el nav del prototipo y generaría una URL raíz inconsistente con el resto de specs futuras (incluyendo Acerca de).
- **Sí:** todas las redirecciones/enlaces que antes asumían que `/` era la Biblioteca (auth, salón, detalle, reproductor) se actualizan a `/games`, para preservar el comportamiento original ("volver al catálogo") ahora que cambió la URL.
- **Sí:** "Acerca de" queda fuera de este spec; el link correspondiente del template no se agrega al Nav todavía, para no dejar un enlace roto.
- **Sí:** los arrays de "actividad en vivo" (`HOME_TICKER`, `HOME_TOP_PLAYERS`) se centralizan en `lib/data.ts` junto con `GAMES`, en vez de dejarlos hardcodeados dentro del componente Home, para mantener consistencia con dónde vive el resto del mock data.
- **No:** mover también los textos fijos de la sección de stats (`12+ JUEGOS`, etc.) a `lib/data.ts`. Son contenido puramente decorativo sin forma de lista/estructura repetible, se mantienen inline en el componente.

## What is **not** in this spec

- Página "Acerca de" y su formulario de contacto (pantalla de éxito estilo terminal incluida).
- Backend o lógica real detrás de "actividad en vivo".
- Sistema de créditos/monedas funcional.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.

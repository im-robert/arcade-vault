# SPEC 04 — Configuración base del cliente de Supabase

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-08-16
> **Objective:** Dejar el proyecto Next.js conectado a Supabase (paquetes, variables de entorno y helpers de cliente browser/server/middleware), sin implementar todavía ninguna funcionalidad (auth, tablas, puntuaciones) que los use.

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias del proyecto.
- Agregar a `.env.example` y `.env.local` las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, con los valores reales del proyecto Supabase ya conectado (`swmezsmuwlavtbdtsstl`) en `.env.local`, y placeholders vacíos en `.env.example`.
- Crear `lib/supabase/client.ts`: helper `createClient()` que instancia el cliente de Supabase para uso en Client Components (`createBrowserClient` de `@supabase/ssr`).
- Crear `lib/supabase/server.ts`: helper `createClient()` async que instancia el cliente de Supabase para uso en Server Components, Server Actions y Route Handlers, leyendo/escribiendo cookies vía `next/headers` (`await cookies()`, patrón async requerido por Next.js 16).
- Crear `lib/supabase/middleware.ts` con la función `updateSession(request)` que refresca la sesión de Supabase leyendo/escribiendo cookies sobre la respuesta.
- Crear `middleware.ts` en la raíz del proyecto que invoca `updateSession` en cada request (matcher estándar que excluye assets estáticos).
- Verificar que el proyecto compila y arranca (`npm run dev` / `npm run build`) sin errores de consola, sin que ninguna ruta o componente use todavía los helpers creados.

**Out of scope (for future specs):**

- Creación de cualquier tabla en Supabase (usuarios, puntuaciones, juegos) — la base de datos remota queda vacía tras esta spec.
- Autenticación real (signup/login/logout con Supabase Auth) — los helpers quedan listos pero sin ningún flujo que los invoque.
- Migrar `av_user`/`av_scores` de `localStorage` a Supabase.
- Proveedores OAuth (Google/GitHub) — decisión de qué método de auth usar queda para la spec que implemente auth.
- Row Level Security (RLS) y políticas — no aplica porque no hay tablas todavía.
- Tests automatizados.

## Data model

Esta spec no introduce estructuras de datos nuevas ni tablas en Supabase. Solo define los helpers de conexión:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient; // uso en Client Components

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient>; // uso en Server Components/Actions/Route Handlers

// lib/supabase/middleware.ts
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse>;
```

Variables de entorno (públicas, expuestas al cliente vía prefijo `NEXT_PUBLIC_`):

```
NEXT_PUBLIC_SUPABASE_URL=https://swmezsmuwlavtbdtsstl.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6q-DPTTPDOH2mqrKbANeHg_IHqDyjga
```

Es la key `publishable` real del proyecto (obtenida vía MCP `get_publishable_keys`). No es secreta — está diseñada para exponerse en el cliente — por eso puede documentarse aquí y en `.env.local` con su valor real; en `.env.example` queda vacía como el resto de las variables.

`SUPABASE_DB_PASSWORD` (ya presente en `.env.local`/`.env.example`) no se usa en esta spec — es para acceso directo a Postgres (migraciones, MCP), no para el cliente JS.

## Implementation plan

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install @supabase/supabase-js @supabase/ssr`).
2. Agregar `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` a `.env.example` (vacíos, con comentario indicando que se obtienen del dashboard de Supabase o vía MCP `get_project_url`/`get_publishable_keys`), y con los valores reales del proyecto conectado en `.env.local`.
3. Crear `lib/supabase/client.ts` con `createClient()` usando `createBrowserClient` de `@supabase/ssr` y las dos env vars públicas.
4. Crear `lib/supabase/server.ts` con `createClient()` async usando `createServerClient` de `@supabase/ssr`, leyendo cookies vía `await cookies()` de `next/headers` (getAll/setAll).
5. Crear `lib/supabase/middleware.ts` con `updateSession(request)` siguiendo el patrón oficial de Supabase para Next.js App Router (crea un cliente server-side ligado a la request/response, llama a `supabase.auth.getUser()` para refrescar el token, y devuelve la response con las cookies actualizadas).
6. Crear `middleware.ts` en la raíz que llama a `updateSession(request)` y define el `matcher` excluyendo `_next/static`, `_next/image`, archivos con extensión de imagen, y `favicon.ico`.
7. Correr `npm run build` y `npm run dev` para confirmar que el proyecto compila y arranca sin errores de consola, sin haber tocado ninguna página existente.

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen en `package.json` como dependencias.
- [ ] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (vacías).
- [ ] `.env.local` tiene los valores reales de esas dos variables para el proyecto `swmezsmuwlavtbdtsstl`.
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts` y `lib/supabase/middleware.ts` existen y exportan `createClient`/`updateSession` según lo descrito en el modelo de datos.
- [ ] `middleware.ts` existe en la raíz, invoca `updateSession` y excluye assets estáticos del matcher.
- [ ] `npm run build` termina sin errores.
- [ ] `npm run dev` levanta la app y las 5 rutas existentes (`/`, `/games`, `/juego/[id]`, `/auth`, `/salon-de-la-fama`) siguen funcionando igual que antes, sin errores de consola.
- [ ] Ningún componente o ruta existente importa los helpers de `lib/supabase/*` todavía (verificable con una búsqueda de texto).

## Decisions

- **Sí:** esta spec solo deja el "cableado" de Supabase listo (paquetes, env vars, helpers de cliente/servidor/middleware), sin tablas ni lógica de auth/puntuaciones, por pedido explícito del usuario — evita mezclar decisiones de modelado de datos con la configuración base.
- **Sí:** se usa `@supabase/ssr` (no solo `@supabase/supabase-js` directo) porque es el paquete oficial recomendado por Supabase para Next.js App Router, maneja correctamente cookies entre browser/server/middleware.
- **Sí:** se incluye `middleware.ts` con refresco de sesión desde ahora, aunque todavía no hay login real, para no tener que rehacer ese wiring cuando se implemente auth en una spec futura.
- **Sí:** las env vars usan la `publishable key` (`sb_publishable_...`) en vez de la `anon key` legacy (JWT), siguiendo la recomendación actual de Supabase para proyectos nuevos.
- **No:** crear tablas, políticas RLS, o cualquier esquema en la base de datos — se deja explícitamente para specs futuras que definan qué datos se persisten (auth, puntuaciones, catálogo).
- **No:** conectar los helpers a ninguna pantalla existente (`/auth`, reproductor, salón de la fama) — el objetivo es solo verificar que el cliente se puede instanciar y que el proyecto sigue compilando.

## What is **not** in this spec

- Autenticación real (signup, login, logout, sesión de usuario) con Supabase Auth.
- Cualquier tabla o esquema en la base de datos Supabase.
- Migración de `av_user`/`av_scores` desde `localStorage`.
- Row Level Security y políticas de acceso.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.

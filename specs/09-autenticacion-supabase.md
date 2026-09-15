# SPEC 09 — Registro, login y autenticación real con Supabase Auth

> **Estado:** Aprobado
> **Depende de:** SPEC 04
> **Fecha:** 2026-09-12
> **Objetivo:** Reemplazar el login local (`av_user` en `localStorage`) de `/auth` por autenticación real con Supabase Auth (email/contraseña + Google/GitHub), con verificación de email, recuperación de contraseña y perfiles propios, manteniendo el modo invitado.

## Por qué existe esta spec

`app/auth/page.tsx` hoy es un formulario decorativo: cualquier nombre escrito se guarda tal cual en `localStorage` (`av_user`) sin backend real, sin verificación y sin contraseña válida. El proyecto ya trae `@supabase/ssr` configurado (SPEC 04) con clientes de browser/server y `middleware.ts` refrescando la sesión en cada request, pero nunca se conectó `supabase.auth`. Esta spec cierra esa brecha: registro y login reales, con perfil (`username`) propio porque Supabase Auth no tiene ese campo nativo, y atribución opcional de las puntuaciones a una cuenta real vía `scores.user_id`.

## Alcance

**Dentro:**

- Registro con **usuario + correo + contraseña** vía `supabase.auth.signUp`, con `username` guardado en una tabla `profiles` propia (no en `user_metadata`), y verificación de email obligatoria antes de poder iniciar sesión.
- Login con **correo + contraseña** (el tab "INICIAR SESIÓN" cambia su campo de "Usuario" a "Correo electrónico" — Supabase Auth no soporta login nativo por username).
- Login/registro social con **Google y GitHub** vía `supabase.auth.signInWithOAuth`, asumiendo que ambos providers ya están habilitados con sus credenciales en el dashboard de Supabase (paso manual fuera de esta spec, ver Riesgos).
- Recuperación de contraseña: "olvidé mi contraseña" en el tab de login → `resetPasswordForEmail` → enlace de correo → pantalla nueva para fijar la contraseña.
- Ruta de callback (`app/auth/callback/route.ts`) que intercambia el código de Supabase por una sesión, para los tres flujos que redirigen ahí: confirmación de email, login OAuth y recuperación de contraseña.
- El botón **"JUGAR COMO INVITADO"** se mantiene: sigue permitiendo jugar y guardar puntuación con un nombre libre, sin cuenta.
- `components/Nav.tsx` refleja la sesión real: nombre del perfil logueado + botón de salir (`supabase.auth.signOut()`) en vez del `clearUser()` actual.
- `app/juego/[id]/jugar/page.tsx`: sigue precargando el nombre para el input de iniciales, ahora desde el perfil de la sesión real cuando existe; si hay sesión, la puntuación guardada incluye `user_id`.
- Mensajes de error en español para los casos esperables: credenciales inválidas, username duplicado, email no verificado, contraseñas que no coinciden.

**Fuera (para specs futuras):**

- Editar el `username` después de creada la cuenta, o cualquier pantalla de "mi perfil".
- Eliminar cuenta.
- Roles, permisos de administrador o cualquier distinción entre jugadores.
- Autenticación multifactor (MFA).
- Providers sociales distintos de Google/GitHub.
- Rate limiting o CAPTCHA anti-bot en el formulario.
- Vincular una cuenta OAuth con una cuenta de email/contraseña ya existente con el mismo correo (caso de identidades duplicadas).
- Configurar las credenciales de Google/GitHub OAuth en el dashboard de Supabase — esta spec implementa el código asumiendo que ya están habilitadas; si no lo están, los botones sociales fallarán con el error que devuelva Supabase.
- Personalizar las plantillas de email de Supabase Auth (confirmación / recuperación) — se usan las plantillas por defecto del proyecto.

## Modelo de datos

```sql
-- Nueva tabla: perfil propio, 1:1 con auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Sin policy de insert/update público: solo el trigger (security definer) escribe aquí.

-- Trigger: crea el profile automáticamente al registrarse
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- scores: se agrega vínculo opcional a la cuenta real, sin tocar player_name
alter table public.scores add column user_id uuid references auth.users(id) on delete set null;
```

Convenciones:

- `username` se pasa en `signUp({ options: { data: { username } } })` para email/contraseña; en login social (Google/GitHub) no hay username elegido por el usuario, así que el trigger genera uno desde el prefijo del email + sufijo del `id` (ver `coalesce` arriba). Cambiarlo queda fuera de esta spec.
- `profiles.username` es la única fuente de verdad para el nombre mostrado en `Nav` y precargado en el input de iniciales — no se vuelve a leer `user_metadata` para esto.
- `scores.player_name` sigue siendo el texto libre que ya existe hoy (igual para invitados y cuentas reales); `scores.user_id` es un vínculo adicional, nullable, que no reemplaza ni valida `player_name`.
- Un username duplicado provoca que el `insert` del trigger viole la unique constraint (código Postgres `23505`); `lib/session.ts` debe detectar ese código y traducirlo a "Ese usuario ya existe, elige otro" en vez de mostrar el error crudo.

## Plan de implementación

1. **Migración de base de datos.** Aplicar (vía MCP de Supabase) la migración de la sección anterior: tabla `profiles`, su RLS, la función/trigger `handle_new_user`, y la columna `scores.user_id`. El sitio sigue funcionando igual que hoy (nada del frontend cambió todavía).
2. **`lib/session.ts` sobre Supabase Auth.** Reescribir el módulo para envolver `supabase.auth`: `getUser()` pasa a ser async (lee `supabase.auth.getUser()` + `profiles.username` de la sesión activa), y se agregan `signUpWithPassword`, `signInWithPassword`, `signInWithOAuth`, `signOut`, `requestPasswordReset`, `updatePassword`. `saveScore` gana un `userId` opcional que, si viene, se inserta en `scores.user_id`. Se elimina el uso de `localStorage` (`av_user`).
3. **Ruta de callback.** Crear `app/auth/callback/route.ts` con el patrón estándar de `@supabase/ssr` (`exchangeCodeForSession`), usado por los tres flujos (confirmación de email, OAuth, recuperación de contraseña). Redirige a `/games` si hay sesión válida, o a `/auth?error=...` si el intercambio falla.
4. **Pantalla de nueva contraseña.** Crear `app/auth/nueva-password/page.tsx`: un único campo de contraseña que llama `updatePassword` sobre la sesión de recuperación ya activa (llegada vía el callback del paso 3), y redirige a `/games` al terminar.
5. **Reescribir `app/auth/page.tsx`.** Tab de login con correo + contraseña y enlace "¿Olvidaste tu contraseña?" que dispara `requestPasswordReset` y muestra un estado "revisa tu correo". Tab de registro con usuario + correo + contraseña, que tras `signUpWithPassword` exitoso muestra un estado "confirma tu correo para continuar" en vez de redirigir (porque no puede loguear hasta confirmar). Botones de Google/GitHub llaman `signInWithOAuth`. "JUGAR COMO INVITADO" ahora también llama `signOut()` antes de navegar, por si había una sesión real activa. Mensajes de error traducidos para credenciales inválidas, username duplicado y contraseñas que no coinciden.
6. **`components/Nav.tsx`.** Cambiar el `useEffect` para usar el nuevo `getUser()` async; el botón de sesión iniciada llama `signOut()` en vez de `clearUser()`.
7. **`app/juego/[id]/jugar/page.tsx`.** Adaptar la carga inicial a `getUser()` async; si hay sesión, pasar `userId` a `saveScore` junto con el `name` que ya se envía hoy.
8. **Verificación manual completa.** Registro con email/contraseña → confirmar por correo → login. Login con credenciales incorrectas → mensaje de error. Recuperar contraseña → fijar una nueva → loguear con ella. Login social con Google y con GitHub (si ya están habilitados en el dashboard). Jugar como invitado sin cuenta. Cerrar sesión desde `Nav`. Verificar en Supabase que una puntuación guardada estando logueado trae `user_id` y que una de invitado lo trae `null`. Correr `npm run build` y `npm run lint`.

## Criterios de aceptación

- [ ] Un usuario nuevo puede registrarse con usuario + correo + contraseña y no puede iniciar sesión hasta confirmar el correo.
- [ ] Tras hacer clic en el enlace de confirmación del correo, el usuario queda con sesión iniciada y es redirigido a `/games`.
- [ ] El login con correo + contraseña correctos inicia sesión; con credenciales incorrectas muestra un mensaje de error en español, sin redirigir.
- [ ] Registrarse con un `username` ya existente muestra "Ese usuario ya existe, elige otro" en vez de un error crudo de base de datos.
- [ ] "¿Olvidaste tu contraseña?" envía el correo de recuperación, y el enlace lleva a una pantalla donde se puede fijar una nueva contraseña y luego loguear con ella.
- [ ] Con Google y GitHub habilitados en el dashboard de Supabase, ambos botones inician sesión correctamente y crean su `profile` con un username generado automáticamente.
- [ ] "JUGAR COMO INVITADO" sigue funcionando sin cuenta: permite jugar y guardar puntuación con un nombre libre.
- [ ] `Nav` muestra el username del perfil cuando hay sesión iniciada, y "Iniciar Sesión" cuando no la hay; el botón de sesión iniciada cierra sesión correctamente.
- [ ] Una puntuación guardada con sesión iniciada tiene `scores.user_id` igual al id del usuario; una guardada como invitado tiene `scores.user_id` nulo.
- [ ] `npm run build` y `npm run lint` pasan sin errores nuevos respecto al estado antes de esta spec.

## Decisiones

**Sí:**

- **Supabase Auth real**, reemplazando `av_user` en `localStorage` — es la única forma de tener cuentas verificables y vinculables a `scores`.
- **Login por correo, no por username** — Supabase Auth no soporta login nativo por username; exponer un lookup público de username→email para permitirlo agregaría superficie de ataque sin necesidad real.
- **Tabla `profiles` propia** (en vez de `user_metadata`) para el `username` — da unicidad real vía constraint y permite `JOIN` con `scores` a futuro.
- **Verificación de email obligatoria** — usa las plantillas y el envío de correo propios de Supabase Auth (no Resend, que en este proyecto solo se usa para el formulario de contacto).
- **Recuperación de contraseña incluida** en esta misma spec, no diferida.
- **`scores.user_id` nuevo, nullable** — vincula partidas a cuentas reales sin tocar `player_name` ni romper el flujo de invitado existente.
- **Modo invitado se mantiene intacto** — crear cuenta es opcional, nunca obligatorio para jugar.
- **`Nav` en alcance** — sin esto la sesión real quedaría invisible en el resto del sitio.
- **Username duplicado → mensaje traducido** detectando el código `23505` de Postgres, en vez de una consulta previa que agregaría una condición de carrera y una query extra.
- **OAuth con Google y GitHub** en el código de esta spec, aunque su habilitación con credenciales en el dashboard de Supabase es un paso manual externo que esta spec no ejecuta.

**No:**

- **Editar username o eliminar cuenta** — no hay pantalla de perfil todavía; se decidió no abrirla en esta spec.
- **Roles/permisos, MFA, más providers sociales, CAPTCHA** — ninguno se mencionó como necesidad actual; se dejan fuera hasta que haga falta.
- **Vincular identidades** (mismo correo con OAuth y con contraseña) — caso borde que se deja sin resolver explícitamente por ahora.
- **Personalizar plantillas de email de Supabase Auth** — se usan las plantillas por defecto; personalizarlas es un cambio de configuración del proyecto, no de código.

## Riesgos

| Riesgo                                                                                                                 | Mitigación                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los providers de Google/GitHub no están configurados (client id/secret) en el dashboard de Supabase                    | Los botones sociales quedan implementados pero fallarán con el error que devuelva Supabase hasta que se configuren manualmente; documentar el paso pendiente al entregar. |
| El envío de correos de Supabase Auth (confirmación/recuperación) usa el servicio por defecto con límites de tasa bajos | Suficiente para verificación manual puntual; si se necesita volumen real, configurar SMTP propio queda fuera de esta spec.                                                |
| Un email ya registrado con contraseña intenta loguearse luego con Google (mismo correo)                                | Supabase devuelve un error de identidad duplicada; no se resuelve en esta spec (ver Decisiones → No: vincular identidades).                                               |

## Lo que **no** entra en esta spec

- Pantalla de "mi perfil" o edición de username.
- Eliminar cuenta.
- Roles, permisos de administrador o multi-factor auth (MFA).
- Providers sociales distintos de Google/GitHub.
- Rate limiting/CAPTCHA en el formulario.
- Vincular una cuenta OAuth con una de email/contraseña del mismo correo.
- Configurar las credenciales de Google/GitHub en el dashboard de Supabase.
- Personalizar las plantillas de email de Supabase Auth.

Cada uno de estos, si se implementa, va en su propia spec.

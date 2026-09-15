# SPEC 10 — Medidas de seguridad del checklist básico

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 06, SPEC 09
> **Fecha:** 2026-09-14
> **Objetivo:** Cerrar los hallazgos accionables por código del checklist de seguridad (`references/security/security_checklist.md`) — revocar el `EXECUTE` público de una función `SECURITY DEFINER` huérfana, añadir headers de seguridad HTTP en Next.js y validar en el cliente la longitud mínima de contraseña — dejando documentados como pasos manuales de dashboard los ajustes de Supabase Auth que no son configurables por código.

## Por qué existe esta spec

`references/security/security_checklist.md` reúne un checklist básico de seguridad más una tabla de hallazgos del linter de seguridad de Supabase. Antes de escribir esta spec se verificó el estado real del proyecto:

- RLS ya está habilitado en `games` y `scores` (`supabase/migrations/20260816191454_games_and_scores.sql`) — el ítem del checklist ya está cumplido, sin acción pendiente.
- El advisor de seguridad en vivo (`mcp__supabase__get_advisors`, tipo `security`) reporta **3 hallazgos reales**, no los que aparecen en el snapshot estático del checklist:
  1. `anon_security_definer_function_executable` — `public.rls_auto_enable()` ejecutable por el rol `anon` vía RPC.
  2. `authenticated_security_definer_function_executable` — la misma función ejecutable por el rol `authenticated`.
  3. `auth_leaked_password_protection` — deshabilitada.
- El hallazgo `rls_policy_always_true` sobre `scores_public_insert` que aparece en el snapshot del checklist **ya no lo reporta el advisor en vivo** — es el diseño intencional de invitados de SPEC 06 (`WITH CHECK (true)`), no requiere cambio.
- `public.rls_auto_enable()` es una función `SECURITY DEFINER` de tipo `event trigger` (auto-habilita RLS en tablas nuevas) que **no está en ninguna migración rastreada** del repo — quedó creada fuera del flujo de migraciones, con `EXECUTE` todavía concedido a `PUBLIC`.
- `next.config.ts` no define headers de seguridad hoy.
- Los ajustes de Supabase Auth del checklist (longitud mínima de contraseña, leaked password protection, límite de signups por IP) **solo existen en el dashboard del proyecto** — no hay una herramienta MCP ni un `config.toml` local para fijarlos por código o migración.

## Alcance

**Dentro:**

- Migración que revoca `EXECUTE` sobre `public.rls_auto_enable()` de `public`, `anon` y `authenticated`, con el mismo patrón ya usado para `handle_new_user` en `supabase/migrations/20260913005943_revoke_public_execute_handle_new_user.sql`, sin tocar la lógica interna de la función.
- Headers de seguridad HTTP en `next.config.ts` para todas las rutas: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` (los tres del checklist) y `Strict-Transport-Security`.
- Validación en el cliente de longitud mínima de contraseña (8 caracteres) en el formulario de registro de `app/auth/page.tsx`: atributo `minLength={8}` en el input y mensaje de error en español antes de llamar a `signUpWithPassword` si no cumple.
- Documentar en esta spec, como checklist manual para quien la implemente, los tres ajustes de Supabase Auth que deben activarse desde el dashboard del proyecto (ver Plan de implementación, paso 4).
- Verificación final con `mcp__supabase__get_advisors` (tipo `security`) para confirmar que los dos hallazgos de `SECURITY DEFINER` desaparecen.

**Fuera (para specs futuras o pasos manuales sin código):**

- Configurar en el dashboard de Supabase la longitud mínima de contraseña, el toggle de "Leaked password protection" y el límite de rate de signups — son ajustes de proyecto, no de código; quedan como pasos manuales documentados, igual que las credenciales OAuth en SPEC 09.
- Cualquier throttling o rate-limiting propio a nivel de aplicación (middleware, CAPTCHA) sobre `/auth` — se decidió usar únicamente el rate limit nativo de Supabase Auth, sin código adicional. Ya estaba fuera de alcance en SPEC 09 y se mantiene fuera aquí.
- Endurecer `scores_public_insert` (`WITH CHECK (true)`) — es el diseño intencional de SPEC 06 para el modo invitado; el advisor en vivo ya no lo reporta como hallazgo.
- Content-Security-Policy (CSP) — no está en el checklist y requeriría un ajuste fino por recurso (scripts, estilos, fuentes) con pruebas exhaustivas antes de habilitarlo sin riesgo de romper la app.
- Cualquier otro hallazgo de `get_advisors` (tipo `security` o `performance`) que no esté listado arriba y que aparezca en el futuro — se atiende en su propia spec.
- Protección de rutas de página vía middleware exigiendo sesión iniciada — hoy no existe ninguna ruta que deba requerir cuenta (SPEC 09 mantiene el modo invitado en todo el catálogo/juegos/hall of fame); se retoma en una spec futura cuando exista una ruta concreta que lo necesite (p. ej. una pantalla de perfil).

## Modelo de datos

No se introducen tablas ni columnas nuevas. Cambia únicamente un permiso (`GRANT`/`REVOKE`) sobre una función existente:

```sql
-- supabase/migrations/<timestamp>_revoke_rls_auto_enable_execute.sql
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Convenciones:

- Mismo patrón que `20260913005943_revoke_public_execute_handle_new_user.sql`: revocar sin modificar la definición de la función ni su comportamiento como event trigger.
- No se toca la tabla `pg_event_trigger` ni el trigger que invoca `rls_auto_enable()` — solo se le quita la posibilidad de ser llamada directamente vía RPC (`/rest/v1/rpc/rls_auto_enable`).

## Plan de implementación

1. **Migración de revocación.** Aplicar (vía MCP de Supabase) la migración de la sección anterior. El sitio sigue funcionando igual — `rls_auto_enable()` sigue disparándose como event trigger al crear tablas, solo deja de ser invocable directamente por `anon`/`authenticated`.
2. **Headers de seguridad en `next.config.ts`.** Agregar la función `headers()` aplicando a `/(.*)`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
3. **Validación de contraseña en `app/auth/page.tsx`.** Añadir `minLength={8}` al input de contraseña del formulario de registro y un mensaje de error en español ("La contraseña debe tener al menos 8 caracteres") que se muestra antes de llamar a `signUpWithPassword` si el valor no cumple, sin bloquear el tab de login (que ya valida contra credenciales reales en el servidor).
4. **Checklist manual de ajustes de Supabase Auth (sin código).** Documentar y dejar pendiente para quien implemente, a activar manualmente en el dashboard del proyecto (`Authentication` → `Policies`/`Providers`/`Rate Limits`):
   - Longitud mínima de contraseña: 8 caracteres.
   - Leaked password protection: habilitada.
   - Rate limit de signups por IP: usar el valor por defecto de Supabase Auth o ajustarlo según el tráfico esperado.
5. **Verificación.** Correr `mcp__supabase__get_advisors` (tipo `security`) y confirmar que `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` ya no aparecen (el hallazgo de `auth_leaked_password_protection` seguirá apareciendo hasta que se complete el paso manual 4, lo cual es esperado). Correr `npm run build` y `npm run lint`. Verificar manualmente en el navegador (DevTools → Network → Headers de la respuesta) que los 4 headers del paso 2 están presentes. Verificar manualmente que el formulario de registro rechaza una contraseña de menos de 8 caracteres antes de enviarla.

## Criterios de aceptación

- [ ] `mcp__supabase__get_advisors` (tipo `security`) ya no reporta `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` para `rls_auto_enable()`.
- [ ] Crear una tabla nueva en `public` sigue habilitando RLS automáticamente (el event trigger sigue funcionando pese a la revocación de `EXECUTE`).
- [ ] La respuesta HTTP de cualquier ruta incluye `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Strict-Transport-Security`.
- [ ] El formulario de registro en `/auth` muestra un error en español y no llama a `signUpWithPassword` si la contraseña tiene menos de 8 caracteres.
- [ ] El checklist manual de los 3 ajustes de Supabase Auth (longitud mínima, leaked password protection, rate limit de signups) queda documentado y comunicado como pendiente de activación en el dashboard.
- [ ] `npm run build` y `npm run lint` pasan sin errores nuevos respecto al estado antes de esta spec.

## Decisiones

**Sí:**

- **Revocar `EXECUTE` de `rls_auto_enable()`** siguiendo el patrón ya establecido para `handle_new_user` — consistente con el resto del repo y sin tocar el comportamiento del event trigger.
- **Headers de seguridad en `next.config.ts`**: los 3 del checklist más `Strict-Transport-Security` — bajo riesgo, alto valor, no requiere pruebas exhaustivas como sí las requeriría CSP.
- **Validación cliente de contraseña (mínimo 8)** en el registro — evita un roundtrip al servidor solo para mostrar un error de longitud, y es consistente con lo que se configurará en el dashboard.
- **Ajustes de Supabase Auth como pasos manuales documentados**, no como código — no existe forma de fijarlos vía SQL/MCP en este proyecto (no hay `config.toml` local ni herramienta MCP para `Auth config`); se sigue el mismo patrón que las credenciales OAuth de SPEC 09.
- **Solo el rate limit nativo de Supabase Auth** para signups — no se agrega throttling propio a nivel de aplicación, manteniendo la decisión de SPEC 09 de no introducir rate limiting/CAPTCHA en el formulario.

**No:**

- **Endurecer `scores_public_insert`** — es diseño intencional de SPEC 06 (modo invitado sin cuenta) y el advisor en vivo ya no lo reporta como hallazgo; tocarlo es una decisión de otra spec si se decide requerir autenticación para puntuar.
- **Content-Security-Policy** — no estaba en el checklist entregado y su configuración segura requiere una auditoría de recursos externos que esta spec no cubre.
- **Throttling/CAPTCHA propio en `/auth`** — ya se descartó explícitamente en SPEC 09; esta spec no reabre esa decisión más allá de habilitar el rate limit nativo del dashboard.

## Riesgos

| Riesgo                                                                                                       | Mitigación                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los 3 ajustes de Supabase Auth (paso manual) no se activan tras implementar el código                        | El advisor seguirá reportando `auth_leaked_password_protection` hasta que se complete manualmente; se documenta como pendiente explícito en la entrega.       |
| `Strict-Transport-Security` con `preload` puede ser difícil de revertir si el dominio no sirve siempre HTTPS | El proyecto ya corre sobre Vercel/HTTPS por defecto; si se detecta un entorno sin HTTPS consistente, se puede quitar `preload` sin afectar los demás headers. |
| Revocar `EXECUTE` sobre una función no rastreada en migraciones podría tener un motivo no documentado        | Se verificó que es un event trigger estándar de auto-habilitación de RLS (patrón conocido); revocar `EXECUTE` no cambia que se siga disparando como trigger.  |

## Lo que **no** entra en esta spec

- Configurar en el dashboard de Supabase la longitud mínima de contraseña, leaked password protection y rate limit de signups (queda como paso manual documentado).
- Rate limiting o CAPTCHA propio a nivel de aplicación.
- Endurecer la policy `scores_public_insert`.
- Content-Security-Policy.

Cada uno de estos, si se implementa, va en su propia spec.

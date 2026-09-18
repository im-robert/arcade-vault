# Historial de auditorías de seguridad

Memoria del agente `security-auditor` (solo lectura — nunca aplica cambios).
Cada entrada registra una auditoría y sus hallazgos, clasificados y con el
arreglo recomendado como texto. El agente lee este archivo antes de auditar
de nuevo, para no repetir hallazgos ya reportados como "nuevos".

Clasificación: `Arreglo recomendado` · `Paso manual de dashboard` · `Requiere decisión/spec nueva` · `Descartado por diseño intencional`

## 2026-09-14

Primera entrada del historial. Línea base: SPEC 09 (auth real con Supabase) y
SPEC 10 (checklist de seguridad) ya aprobadas e implementadas; migración
`20260915010305_revoke_rls_auto_enable_execute.sql` ya aplicada (visible en
`list_migrations`, aún sin commitear según `git status`).

### Confirmaciones (línea base verificada, sin acción pendiente)

- **Origen:** advisor + SQL.
- **Hallazgo:** `RLS` habilitado en `public.games`, `public.scores` y `public.profiles` (`list_tables` → `rls_enabled: true` en las tres).
- **Clasificación:** Descartado por diseño intencional (ya resuelto).
- **Notas:** Cumple el checklist básico de `security_checklist.md`.

- **Origen:** SQL (`routine_privileges` sobre `pg_proc`).
- **Hallazgo:** Las funciones `SECURITY DEFINER` `public.rls_auto_enable()` y `public.handle_new_user()` solo conceden `EXECUTE` a `postgres` y `service_role`. Ni `anon` ni `authenticated` aparecen en los grants.
- **Clasificación:** Descartado por diseño intencional (ya resuelto).
- **Notas:** Confirma que las migraciones `20260913005943_revoke_public_execute_handle_new_user.sql` y `20260915010305_revoke_rls_auto_enable_execute.sql` surtieron efecto. El advisor en vivo ya no reporta `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable` (ver sección de advisor más abajo).

- **Origen:** SQL (`pg_policies`).
- **Hallazgo:** Policies actuales en `public`: `games_public_read` (SELECT, `true`), `scores_public_read` (SELECT, `true`), `scores_public_insert` (INSERT, `WITH CHECK (true)`), `profiles_select_own` (SELECT, `auth.uid() = id`). No hay policy de INSERT/UPDATE pública en `profiles` (coincide con SPEC 09: solo el trigger `security definer` escribe ahí).
- **Clasificación:** Descartado por diseño intencional.
- **Notas:** `scores_public_insert` con `WITH CHECK (true)` es el modo invitado de SPEC 06/10 — no se recomienda ni se debe endurecer.

- **Origen:** código (`next.config.ts`).
- **Hallazgo:** Los 4 headers de SPEC 10 (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`) están presentes sobre `/(.*)`.
- **Clasificación:** Descartado por diseño intencional (ya resuelto).

- **Origen:** código (`app/auth/page.tsx`, `lib/session.ts`).
- **Hallazgo:** El input de contraseña del tab de registro tiene `minLength={8}` y el submit valida `pass.length < 8` mostrando "La contraseña debe tener al menos 8 caracteres" antes de llamar a `signUpWithPassword`. El login (`signInWithPassword`) devuelve un mensaje genérico "Correo o contraseña incorrectos" sin distinguir si el correo existe.
- **Clasificación:** Descartado por diseño intencional (ya resuelto).

- **Origen:** código (`proxy.ts`).
- **Hallazgo:** La convención `proxy.ts` (no `middleware.ts`) ya está en uso, exporta `proxy()` y llama a `updateSession` de `lib/supabase/middleware.ts` con el mismo `matcher` documentado en SPEC 10.
- **Clasificación:** Descartado por diseño intencional (ya resuelto).

- **Origen:** código (`lib/supabase/{client,server,middleware}.ts`) + `Grep` sobre todo el repo (`service_role|SERVICE_ROLE_KEY|BEGIN PRIVATE KEY`).
- **Hallazgo:** Los tres clientes de Supabase (browser/server/middleware) usan únicamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. El grep sobre el repo solo encontró coincidencias dentro de la definición del propio patrón en `.claude/agents/security-auditor.md` (el patrón de búsqueda, no un secreto real) — ningún service role key ni clave privada hardcodeada en el código.
- **Clasificación:** Descartado por diseño intencional (ya resuelto).

- **Origen:** código (`app/api/contact/route.ts`).
- **Hallazgo:** Valida que `name`/`email`/`message` sean strings no vacíos (`.trim()`), valida formato de email con regex, escapa HTML antes de interpolar en el cuerpo del correo (`escapeHtml`), y `RESEND_API_KEY`/`CONTACT_TO_EMAIL`/`CONTACT_FROM_EMAIL` solo se leen en el handler del servidor (nunca expuestos con prefijo `NEXT_PUBLIC_`).
- **Clasificación:** Descartado por diseño intencional (ya resuelto) — ver hallazgo nuevo abajo sobre longitud/rate limit.

### Hallazgos pendientes (ya conocidos, siguen abiertos)

- **Origen:** advisor (`get_advisors`, tipo `security`).
- **Hallazgo:** `auth_leaked_password_protection` — Leaked Password Protection sigue deshabilitada.
- **Clasificación:** Paso manual de dashboard.
- **Arreglo sugerido (no aplicado):** Activar en el dashboard de Supabase → `Authentication` → `Policies`/`Providers` → habilitar "Leaked password protection" (verifica contra HaveIBeenPwned). Documentado desde SPEC 10 como pendiente; sigue sin completarse.
- **Notas:** Junto con este, quedan pendientes (no verificables por advisor, solo por inspección manual del dashboard) los otros dos ajustes de SPEC 10: longitud mínima de contraseña en el dashboard (8 caracteres) y rate limit de signups por IP.

### Hallazgos nuevos de esta auditoría

- **Origen:** código (`lib/session.ts`, función `signUpWithPassword`).
- **Hallazgo:** Supabase Auth ya implementa protección anti-enumeración en `signUp` (responde 200 sin enviar correo cuando el email ya tiene cuenta, exponiendo `identities: []` en vez de un error). El código de la app detecta explícitamente ese caso y lo traduce a un mensaje específico: `"Ese correo ya tiene una cuenta. Inicia sesión o usa otro."`. Esto reintroduce la fuga de información que Supabase intenta evitar: un atacante puede usar el formulario de registro para enumerar qué correos ya están registrados en Arcade Vault, probando direcciones y observando cuál mensaje devuelve.
- **Clasificación:** Requiere decisión/spec nueva.
- **Notas:** No es un bug de código sino una decisión de UX vs. seguridad no explicitada en SPEC 09 (que solo pide traducir "credenciales inválidas, username duplicado, email no verificado, contraseñas que no coinciden", sin mencionar el caso de email duplicado en signup). Endurecerlo implicaría mostrar un mensaje genérico tipo "Si el correo es válido, revisa tu bandeja" independientemente de si la cuenta existe — un cambio de comportamiento visible que amerita `/spec`, no un arreglo silencioso.

- **Origen:** código (`app/api/contact/route.ts`).
- **Hallazgo:** No hay límite de longitud en `name`/`email`/`message` (solo se exige que no estén vacíos tras `trim()`), ni rate limiting propio sobre el endpoint. Un cliente podría enviar mensajes arbitrariamente largos repetidamente, consumiendo cuota de Resend o generando spam hacia `CONTACT_TO_EMAIL`.
- **Clasificación:** Requiere decisión/spec nueva.
- **Notas:** Es el mismo tipo de decisión que SPEC 09/10 ya tomaron explícitamente para `/auth` (confiar solo en el rate limit nativo de la plataforma, sin CAPTCHA/throttling propio); aquí no hay una decisión explícita documentada para `/api/contact`, así que se reporta en vez de asumir que aplica la misma decisión por analogía.

- **Origen:** `npm audit --omit=dev` (dependencias de producción).
- **Hallazgo:** 4 vulnerabilidades (3 high, 1 critical):
  - **Critical:** `next` (rango instalado, pinned `16.2.12`, dentro del rango vulnerable `9.3.4-canary.0 - 16.3.2`) — "Next.js: Unauthenticated Remote Code Execution on windows-hosted servers" (GHSA-p293-qw3h-jr36) y "Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used" (GHSA-2xp9-vwfh-vxw4). Fix disponible instalando `next@16.3.5`.
  - **High:** `postcss` (dependencia transitiva de `next`, `<=8.5.22`) — XSS en `</style>` sin escapar y varias variantes de lectura arbitraria de archivos vía `sourceMappingURL` en comentarios CSS.
  - **High:** `sharp` (dependencia transitiva de `next`, `<=0.35.4-rc.0`) — vulnerabilidades heredadas de `libvips`/`libheif` (múltiples CVE).
  - **High:** `nanoid` (`<3.3.18`) — generadores custom pueden entrar en loop infinito con `size` cero.
- **Clasificación:** Requiere decisión/spec nueva.
- **Notas:** El fix de `next`/`postcss`/`sharp` requiere `next@16.3.5`, fuera del rango pinneado (`16.2.12`) que `AGENTS.md`/`CLAUDE.md` documentan explícitamente como versión no estándar con posibles breaking changes. Subir de versión es una decisión de alcance (evaluar breaking changes en Next 16.3.x) y no algo que este agente de auditoría deba ni pueda ejecutar — se recomienda abrir `/spec` para planificar el upgrade, dada la severidad "critical" del RCE. `nanoid` tiene fix disponible vía `npm audit fix` sin cambios de rango (no requiere `--force`), pero por contrato este agente no ejecuta `npm audit fix` ni ningún comando de escritura.

## 2026-09-16

Segunda entrada. Auditoría solicitada con foco específico en **autenticación**
(`SPEC 09`). Línea base sin cambios de código ni de migraciones desde la
entrada anterior (`git status` limpio, mismas 6 migraciones en
`list_migrations`, mismo advisor en vivo).

### Confirmaciones (sin cambios desde 2026-09-14)

- **Origen:** advisor + SQL (`list_tables`, grants sobre `pg_proc`, `pg_policies`).
- **Hallazgo:** RLS sigue habilitado en `games`/`scores`/`profiles`; `rls_auto_enable()` y `handle_new_user()` solo conceden `EXECUTE` a `postgres`/`service_role`; policies sin cambios (`games_public_read`, `scores_public_read`, `scores_public_insert` con `WITH CHECK (true)` intencional, `profiles_select_own`).
- **Clasificación:** Descartado por diseño intencional (ya resuelto).

- **Origen:** código (`next.config.ts`, `proxy.ts`, `lib/supabase/{client,server,middleware}.ts`, `app/auth/page.tsx`, `app/auth/nueva-password/page.tsx`, `app/auth/callback/route.ts`, `components/Nav.tsx`, `app/juego/[id]/jugar/page.tsx`).
- **Hallazgo:** Los 4 headers de SPEC 10 siguen presentes; `proxy.ts` sigue exportando `proxy()`; los 3 clientes Supabase solo usan `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (grep de `service_role|SERVICE_ROLE_KEY|BEGIN PRIVATE KEY` sobre todo el repo solo encuentra el propio patrón de búsqueda en `.claude/agents/security-auditor.md` y en este log); `minLength={8}` + validación cliente siguen en el input de contraseña de registro; el flujo completo de SPEC 09 (registro, login, OAuth Google/GitHub vía `signInWithOAuth`, reset de contraseña vía `app/auth/callback/route.ts` + `app/auth/nueva-password/page.tsx`, `Nav` con sesión real y `signOut()`, `saveScore` recibiendo `userId` desde `getUser()` en la página de juego) está implementado end-to-end, contradiciendo el `CLAUDE.md` desactualizado que aún describe `/auth` como "local-only".
- **Clasificación:** Descartado por diseño intencional (ya resuelto).

### Hallazgos pendientes (ya conocidos, siguen abiertos, sin cambios)

- **Origen:** advisor (`get_advisors`, tipo `security`).
- **Hallazgo:** `auth_leaked_password_protection` sigue deshabilitada (único hallazgo que reporta el advisor en vivo en esta corrida).
- **Clasificación:** Paso manual de dashboard.
- **Arreglo sugerido (no aplicado):** Activar en el dashboard de Supabase → `Authentication` → `Policies`/`Providers` → "Leaked password protection". Junto con esto, longitud mínima de contraseña (8) y rate limit de signups por IP en el dashboard, tal como documenta SPEC 10, siguen sin verificarse (no son inspeccionables vía SQL/advisor).

- **Origen:** código (`lib/session.ts`, `signUpWithPassword`).
- **Hallazgo:** Sigue reintroduciendo la fuga de enumeración de correos ya reportada el 2026-09-14: el mensaje "Ese correo ya tiene una cuenta. Inicia sesión o usa otro." permite distinguir correos ya registrados.
- **Clasificación:** Requiere decisión/spec nueva (sin cambios respecto a la entrada anterior).

- **Origen:** código (`app/api/contact/route.ts`).
- **Hallazgo:** Sigue sin límite de longitud en `name`/`email`/`message` ni rate limiting propio.
- **Clasificación:** Requiere decisión/spec nueva (sin cambios respecto a la entrada anterior).

- **Origen:** `npm audit --omit=dev`.
- **Hallazgo:** Mismas 4 vulnerabilidades que el 2026-09-14 (critical en `next` dentro del rango pinneado 16.2.12, high en `postcss`/`sharp` transitivas de `next`, high en `nanoid`). Sin cambios.
- **Clasificación:** Requiere decisión/spec nueva (sin cambios respecto a la entrada anterior).

### Hallazgo nuevo de esta auditoría (foco auth)

- **Origen:** código (`app/auth/callback/route.ts`), verificado con prueba local de parsing de URL (`new URL()`).
- **Hallazgo:** **Open redirect** en la ruta de callback de autenticación. El parámetro `next` llega de `searchParams.get("next")` sin ninguna validación y se usa directo en `NextResponse.redirect(\`${origin}${next}\`)`. Al ser concatenación de strings (no `new URL(next, origin)`), un valor como `next=@evil.com`produce la URL final`https://<origin>@evil.com`, que el parser de URL (y por tanto el navegador) interpreta como *userinfo* `@`seguido del host real`evil.com`— es decir, el usuario termina redirigido a`evil.com`, no al propio dominio. Verificado programáticamente: `new URL("https://arcadevault.com" + "@evil.com").host === "evil.com"`. Este parámetro llega a esa ruta en los tres flujos de SPEC 09 que la usan (confirmación de email, login OAuth, recuperación de contraseña), y solo se dispara tras un intercambio de `code`exitoso, pero eso no impide que un atacante arme un enlace con su propio`code`válido (o abuse de un enlace legítimo reescrito) apuntando a`arcadevault.com/auth/callback?...&next=@evil.com` para hacer phishing con apariencia de dominio confiable, o encadenarlo con otros trucos de sesión.
- **Clasificación:** Requiere decisión/spec nueva. No encaja como "arreglo de patrón ya conocido" porque no hay precedente de validación de redirects en el repo (SPEC 09/10 no lo mencionan), pero es una corrección de bajo riesgo y acotada a un solo archivo, no un cambio de comportamiento visible al usuario legítimo.
- **Arreglo recomendado (no aplicado):** Restringir `next` a una ruta relativa del mismo origen antes de usarla, por ejemplo:
  ```ts
  const rawNext = searchParams.get("next");
  const next =
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("://")
      ? rawNext
      : "/games";
  ```
  y aplicar la misma validación en el fallback de error (`/auth?error=...` ya es un literal fijo, no necesita cambio). Alternativamente, usar `new URL(next, origin)` y comparar `.origin` contra el propio antes de redirigir.
- **Notas:** Es el hallazgo más relevante de esta corrida por estar directamente en la superficie de autenticación pedida por el usuario. Se recomienda priorizarlo sobre los demás "Requiere decisión/spec nueva" ya conocidos, dado que es explotable en la ruta de callback de los tres flujos de SPEC 09.

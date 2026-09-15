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

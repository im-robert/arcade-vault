# SPEC 03 — Página "Acerca de" y envío de correo del formulario de contacto

> **Status:** Approved
> **Depends on:** SPEC 02
> **Date:** 2026-08-15
> **Objective:** Migrar la pantalla "Acerca de" de `references/templates/home-about/about.jsx` a la ruta `/acerca-de`, conectando su formulario de contacto a un endpoint real que envía el mensaje por correo electrónico usando Resend.

## Scope

**In:**

- Nueva ruta `app/acerca-de/page.tsx` — replica exacta de `about.jsx`: hero ("ACERCA DE ARCADE VAULT" + misión + 3 `highlight`), separador `about-divider` animado, y sección de contacto (`contact-grid`) con `contact-intro` (tips) y `contact-form`.
- El formulario de contacto (nombre, correo, mensaje) envía los datos a un Route Handler (`app/api/contact/route.ts`) que usa el SDK de Resend para enviar un correo real.
- Estados del formulario: inicial (campos vacíos), validación de campos requeridos (shake, igual que el template), envío en curso, éxito (pantalla `terminal-success` igual al template, con botón "ENVIAR OTRO MENSAJE"), y error (mensaje simple debajo del formulario si Resend falla, sin perder los datos escritos, permitiendo reintentar).
- Agregar el link "Acerca de" a `components/Nav.tsx` (desktop y panel móvil), apuntando a `/acerca-de`, con su estado activo correspondiente en `isActive`.
- Portar a `app/globals.css` el bloque `/* ===== ABOUT PAGE ===== */` completo de `references/templates/home-about/styles.css` (línea 1071 en adelante).
- Instalar la dependencia `resend` (SDK oficial) y configurar `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` como variables de entorno server-only.
- Crear `.env.example` documentando las tres variables (sin valores reales, salvo `CONTACT_FROM_EMAIL` que sí puede llevar el valor sandbox por defecto ya que no es secreto).
- Validación server-side mínima en el route handler: nombre, correo y mensaje no vacíos, y correo con formato válido; si falla, responde 400 sin llamar a Resend.

**Out of scope (for future specs):**

- Verificar un dominio propio en Resend — se usa el remitente sandbox `onboarding@resend.dev` mientras tanto.
- Persistir los mensajes de contacto en base de datos o backend propio — el único efecto es el envío del correo vía Resend.
- Rate limiting / anti-spam (captcha, honeypot, etc.) en el endpoint de contacto.
- Confirmación por correo al remitente (autoresponder) — solo se notifica al destinatario (`CONTACT_TO_EMAIL`).
- Tests automatizados.

## Data model

Esta spec no introduce estructuras de datos persistentes nuevas (no hay tabla ni entrada en `lib/data.ts`). Sí define el contrato del endpoint:

```ts
// app/api/contact/route.ts

// POST /api/contact
interface ContactRequestBody {
  name: string;
  email: string;
  message: string;
}

// 200 OK
interface ContactSuccessResponse {
  ok: true;
}

// 400 (validación) o 500 (falla de Resend)
interface ContactErrorResponse {
  ok: false;
  error: string; // mensaje corto, apto para mostrar en UI
}
```

Variables de entorno (server-only, no expuestas al cliente):

```
RESEND_API_KEY=       # secreto, va en .env.local, nunca en el repo
CONTACT_TO_EMAIL=capellan1603@gmail.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

## Implementation plan

1. Instalar el SDK `resend` (`npm install resend`) y agregar `.env.example` con `RESEND_API_KEY=`, `CONTACT_TO_EMAIL=capellan1603@gmail.com`, `CONTACT_FROM_EMAIL=onboarding@resend.dev`.
2. Portar el bloque CSS `/* ===== ABOUT PAGE ===== */` de `references/templates/home-about/styles.css` a `app/globals.css`.
3. Crear `app/api/contact/route.ts` con un handler `POST` que: valida `name`/`email`/`message` no vacíos y formato de correo; si falla, responde 400 con `ContactErrorResponse`; si pasa, llama a Resend (`RESEND_API_KEY`, `from: CONTACT_FROM_EMAIL`, `to: CONTACT_TO_EMAIL`, `subject` con el nombre del remitente, `text`/`html` con nombre, correo y mensaje); responde 200 `{ ok: true }` en éxito o 500 `ContactErrorResponse` si Resend lanza error.
4. Crear `app/acerca-de/page.tsx` traduciendo `about.jsx` a TSX: hero, highlights, divisor animado (`reveal` + `IntersectionObserver` vía el mismo patrón/hook usado en Home), y sección de contacto con el `contact-form` controlado (estado `name`/`email`/`message`).
5. Conectar el formulario: en submit, si hay campos vacíos aplicar el efecto `shake` (igual que el template) sin llamar al endpoint; si son válidos, hacer `fetch('/api/contact', { method: 'POST', ... })`, mostrando estado de envío; en éxito mostrar el `terminal-success` idéntico al template (con el nombre ingresado) y botón "ENVIAR OTRO MENSAJE" que resetea el formulario; en error mostrar un mensaje de error simple debajo del formulario (sin perder los valores escritos) para permitir reintentar.
6. Actualizar `components/Nav.tsx`: agregar `Link` "Acerca de" → `/acerca-de` en el menú desktop y en el panel móvil, y extender `isActive` para reconocer `"about"` cuando `pathname === "/acerca-de"`.
7. Revisión visual cruzada contra `references/templates/home-about/arcade-vault-standalone.html`, y prueba manual real: enviar el formulario y confirmar que el correo llega a `capellan1603@gmail.com` vía Resend.

## Acceptance criteria

- [ ] `/acerca-de` muestra la pantalla "Acerca de" completa (hero, misión, 3 highlights, divisor animado, sección de contacto con tips y formulario).
- [ ] El Nav muestra el link "Acerca de" (desktop y móvil) apuntando a `/acerca-de`, activo cuando `pathname === "/acerca-de"`.
- [ ] Enviar el formulario con algún campo vacío dispara el efecto `shake` y no hace ninguna petición de red.
- [ ] Enviar el formulario con todos los campos completos hace `POST /api/contact` y, si Resend responde OK, muestra la pantalla `terminal-success` con el nombre ingresado en mayúsculas.
- [ ] "ENVIAR OTRO MENSAJE" limpia el formulario y vuelve al estado inicial.
- [ ] Si `POST /api/contact` responde error (400 o 500), se muestra un mensaje de error simple debajo del formulario y los valores escritos por el usuario no se pierden.
- [ ] Un envío exitoso real llega como correo a `capellan1603@gmail.com`, enviado desde `onboarding@resend.dev`, con nombre, correo y mensaje del remitente.
- [ ] `RESEND_API_KEY` no se expone al cliente (el fetch del formulario solo llama a `/api/contact`, nunca a la API de Resend directamente).
- [ ] La app compila sin errores de consola en `/acerca-de`.

## Decisions

- **Sí:** el remitente (`CONTACT_FROM_EMAIL`) usa el sandbox de Resend (`onboarding@resend.dev`) porque el destinatario configurado es una cuenta de Gmail (`capellan1603@gmail.com`) y gmail.com no puede verificarse como dominio remitente en Resend. Verificar un dominio propio queda fuera de esta spec.
- **Sí:** `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` viven en variables de entorno (no hardcodeadas), para poder cambiarlas sin tocar código cuando se verifique un dominio propio.
- **Sí:** el envío se hace desde un Route Handler server-side (`app/api/contact/route.ts`), nunca desde el cliente, para no exponer `RESEND_API_KEY`.
- **Sí:** ante un fallo de envío se muestra un mensaje de error simple debajo del formulario (no se rediseña la pantalla `terminal-success` para un estado de error), manteniendo el alcance de esta spec acotado a conectar el formulario existente, no a rediseñar el template.
- **No:** agregar autoresponder al remitente del formulario — el template original no lo contempla y añadiría un segundo envío de correo fuera de alcance.
- **No:** agregar rate limiting/captcha — se deja para una spec futura si el spam se vuelve un problema real.

## What is **not** in this spec

- Verificación de dominio propio en Resend.
- Persistencia de mensajes de contacto en base de datos.
- Rate limiting / anti-spam.
- Autoresponder al remitente.
- Tests automatizados.

Cada uno de estos, si se implementa, va en su propio spec.

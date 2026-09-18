// Env vars públicas de Supabase, validadas en un solo lugar. Se usan tal cual
// (nombres literales `process.env.NEXT_PUBLIC_...`) para que Next.js pueda
// inlinearlas en build; no las envuelvas en una función genérica.
//
// Sin esto, un `NEXT_PUBLIC_*` faltante en el hosting no rompe el build (se
// inlinea como `undefined`) y el fallo aparece en runtime como un fetch a
// "undefined/rest/v1/..." sin pista de la causa real.
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Configúrala en .env.local (desarrollo) ` +
        `o en las variables de entorno del hosting (producción).`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

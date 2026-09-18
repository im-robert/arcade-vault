import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    // max-age bajo y sin "preload" hasta confirmar que el dominio de
    // producción sirve HTTPS en todos sus subdominios: con "preload" y
    // max-age=63072000 (2 años), un dominio mal configurado queda
    // inalcanzable en cualquier navegador que ya lo haya visitado, y no se
    // puede revertir a distancia. Ver specs/10-medidas-seguridad-checklist.md.
    value: "max-age=300; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  // IP de LAN para probar en el celular con `npm run dev`. No afecta
  // `next build`/`next start` — no hace falta quitarlo para producción.
  allowedDevOrigins: ["10.0.0.23"],
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
};

export default nextConfig;

import type { NextConfig } from "next";

/** Cabeceras de seguridad para todas las rutas (F7-BE-01, revisión de seguridad). */
const CABECERAS_SEGURIDAD = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Sólo se optimizan las imágenes propias de /public/imagenes (F9), sin consulta.
  images: {
    localPatterns: [{ pathname: "/imagenes/**", search: "" }],
  },
  headers() {
    return [
      { source: "/:path*", headers: CABECERAS_SEGURIDAD },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

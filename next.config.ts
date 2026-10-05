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
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Zontes · Fidelización",
    short_name: "Zontes",
    description: "Tus puntos, beneficios y novedades de Zontes, Kiden y NIU.",
    lang: "es",
    start_url: "/ingresar",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#1a1a1a",
    prefer_related_applications: false,
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

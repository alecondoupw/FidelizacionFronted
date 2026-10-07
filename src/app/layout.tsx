import type { Metadata, Viewport } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AvisoAppMovil } from "@/components/movil/aviso-app-movil";
import { ProveedorSesion } from "@/lib/auth/sesion";
import "./globals.css";

// Tipografía documentada en SRC-02 p. 8; provisional hasta DEC-11.
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zontes · Fidelización multimarca",
  applicationName: "Zontes",
  appleWebApp: { capable: true, title: "Zontes", statusBarStyle: "default" },
  icons: {
    apple: [
      { url: "/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  description:
    "Plataforma de fidelización multimarca para clientes de Zontes, Kiden y NIU.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${sans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AvisoAppMovil />
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}

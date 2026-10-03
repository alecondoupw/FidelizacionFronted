import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
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
  title: "MOTO LOYALTY · Fidelización Zontes, Kiden y NIU",
  description:
    "Plataforma de fidelización multimarca para clientes de Zontes, Kiden y NIU.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${sans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}

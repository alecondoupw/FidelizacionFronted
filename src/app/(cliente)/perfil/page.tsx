import type { Metadata } from "next";
import { MiPerfil } from "@/components/cuenta/mi-perfil";

export const metadata: Metadata = { title: "Mi perfil · Zontes" };

export default function PerfilClientePage() {
  return <MiPerfil rutaAcceso="/ingresar" />;
}

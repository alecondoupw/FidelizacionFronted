import type { Metadata } from "next";
import { MiPerfil } from "@/components/cuenta/mi-perfil";

export const metadata: Metadata = {
  title: "Mi perfil · Administración",
  robots: { index: false, follow: false },
};

export default function PerfilAdminPage() {
  return <MiPerfil rutaAcceso="/admin/ingresar" />;
}

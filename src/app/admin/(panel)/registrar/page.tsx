import type { Metadata } from "next";
import { RegistrarPuntos } from "@/components/admin/registrar-puntos";

export const metadata: Metadata = {
  title: "Registrar puntos · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RegistrarPuntos />;
}

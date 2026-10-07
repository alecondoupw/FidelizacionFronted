import type { Metadata } from "next";
import { PanelAcceso } from "@/components/acceso/panel-acceso";
import { VerificarCorreo } from "@/components/acceso/verificar-correo";

export const metadata: Metadata = {
  title: "Verifica tu correo · Zontes",
};

export default function VerificarCorreoPage() {
  return (
    <PanelAcceso>
      <VerificarCorreo />
    </PanelAcceso>
  );
}

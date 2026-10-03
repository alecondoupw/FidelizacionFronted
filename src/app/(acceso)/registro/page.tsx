import type { Metadata } from "next";
import Link from "next/link";
import { PanelAcceso } from "@/components/acceso/panel-acceso";
import { RegistroCliente } from "@/components/acceso/registro-cliente";

export const metadata: Metadata = { title: "Registro · MOTO LOYALTY" };

export default function RegistroPage() {
  return (
    <PanelAcceso
      pie={
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/ingresar"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      }
    >
      <RegistroCliente />
    </PanelAcceso>
  );
}

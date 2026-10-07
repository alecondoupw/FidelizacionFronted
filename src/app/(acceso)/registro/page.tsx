import type { Metadata } from "next";
import Link from "next/link";
import { PanelAcceso } from "@/components/acceso/panel-acceso";
import { RegistroCliente } from "@/components/acceso/registro-cliente";

export const metadata: Metadata = { title: "Registro · Zontes" };

export default function RegistroPage() {
  return (
    <PanelAcceso
      imagen={{
        // F9-R04 (SRC-09, DEC-22).
        src: "/imagenes/registro-cliente.jpg",
        alt: "Una sola cuenta para todas tus marcas. Únete y comienza a disfrutar de beneficios exclusivos con Zontes, Kiden y NIU.",
      }}
      pie={
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/ingresar"
            className="font-medium text-acento underline underline-offset-4 hover:decoration-2"
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

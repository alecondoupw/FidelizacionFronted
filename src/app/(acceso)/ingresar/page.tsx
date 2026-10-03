import type { Metadata } from "next";
import { FormularioIngreso } from "@/components/acceso/formulario-ingreso";
import { PanelAcceso } from "@/components/acceso/panel-acceso";

export const metadata: Metadata = { title: "Iniciar sesión · MOTO LOYALTY" };

export default async function IngresarPage({
  searchParams,
}: PageProps<"/ingresar">) {
  const { aviso } = await searchParams;
  return (
    <PanelAcceso>
      <FormularioIngreso
        rol="cliente"
        aviso={typeof aviso === "string" ? aviso : null}
      />
    </PanelAcceso>
  );
}

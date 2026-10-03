import type { Metadata } from "next";
import { FormularioIngreso } from "@/components/acceso/formulario-ingreso";
import { PanelAcceso } from "@/components/acceso/panel-acceso";

export const metadata: Metadata = {
  title: "Acceso de administración · MOTO LOYALTY",
  robots: { index: false, follow: false },
};

export default async function AdminIngresarPage({
  searchParams,
}: PageProps<"/admin/ingresar">) {
  const { aviso } = await searchParams;
  return (
    <PanelAcceso admin>
      <FormularioIngreso
        rol="administrador"
        aviso={typeof aviso === "string" ? aviso : null}
      />
    </PanelAcceso>
  );
}

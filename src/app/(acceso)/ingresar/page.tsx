import type { Metadata } from "next";
import { FormularioIngreso } from "@/components/acceso/formulario-ingreso";
import { PanelAcceso } from "@/components/acceso/panel-acceso";

export const metadata: Metadata = { title: "Iniciar sesión · Zontes" };

export default async function IngresarPage({
  searchParams,
}: PageProps<"/ingresar">) {
  const { aviso } = await searchParams;
  return (
    <PanelAcceso
      tipoIngreso="cliente"
      imagen={{
        // F9-R03 (SRC-09, DEC-22).
        src: "/imagenes/ingresar-cliente.jpg",
        alt: "Tu pasión en un solo lugar. Accede a tu cuenta y sigue disfrutando de todos los beneficios de Zontes, Kiden y NIU.",
      }}
    >
      <FormularioIngreso
        rol="cliente"
        aviso={typeof aviso === "string" ? aviso : null}
      />
    </PanelAcceso>
  );
}

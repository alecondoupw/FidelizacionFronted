import type { Metadata } from "next";
import { Exportar, type InicialExportar } from "@/components/admin/exportar";
import { leerParametros } from "@/lib/parametros";

export const metadata: Metadata = {
  title: "Exportar datos · Administración",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/admin/exportar">) {
  const p = leerParametros(await props.searchParams);
  const inicial: InicialExportar = {
    tipo: p.uno("tipo", ["clientes", "movimientos", "canjes", "actividad"]),
    desde: p.fecha("desde"),
    hasta: p.fecha("hasta"),
    marca: p.marca(),
    estado: p.uno("estado", ["emitido", "entregado", "vencido", "anulado"]),
    tipoMovimiento: p.uno("tipoMovimiento", [
      "otorgamiento",
      "ajuste",
      "canje",
      "vencimiento",
    ]),
    evento: p.uno("evento", [
      "compra",
      "referido",
      "mantenimiento",
      "asistencia",
    ]),
  };
  return <Exportar key={JSON.stringify(inicial)} inicial={inicial} />;
}

import type { Metadata } from "next";
import { ReporteCanjesAdmin } from "@/components/admin/reporte-canjes";
import { leerParametros } from "@/lib/parametros";

export const metadata: Metadata = {
  title: "Reporte de canjes · Administración",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/admin/reporte-canjes">) {
  const p = leerParametros(await props.searchParams);
  const inicial = {
    desde: p.fecha("desde"),
    hasta: p.fecha("hasta"),
    marca: p.marca(),
  };
  return <ReporteCanjesAdmin key={JSON.stringify(inicial)} inicial={inicial} />;
}

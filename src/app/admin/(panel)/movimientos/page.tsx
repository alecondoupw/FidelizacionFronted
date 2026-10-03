import type { Metadata } from "next";
import {
  MovimientosAdmin,
  type FiltroInicialMovimientos,
} from "@/components/admin/movimientos";
import { leerParametros } from "@/lib/parametros";

export const metadata: Metadata = {
  title: "Movimientos · Administración",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/admin/movimientos">) {
  const p = leerParametros(await props.searchParams);
  const inicial: FiltroInicialMovimientos = {
    desde: p.fecha("desde"),
    hasta: p.fecha("hasta"),
    marca: p.marca(),
    tipo: p.uno("tipo", ["otorgamiento", "ajuste", "canje", "vencimiento"]),
    evento: p.uno("evento", [
      "compra",
      "referido",
      "mantenimiento",
      "asistencia",
    ]),
  };
  return <MovimientosAdmin key={JSON.stringify(inicial)} inicial={inicial} />;
}

"use client";

import { List, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { getTendencias, type Metrica } from "@/lib/api/reportes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { etiquetaCubeta, textoRango } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import {
  Chip,
  COLOR_MARCA,
  FiltrosPeriodo,
  filtroInicial,
  GraficoBarras,
  GraficoLineas,
  TextoVariacion,
  type FiltroPeriodo,
} from "./reportes-comun";

const NOMBRE_METRICA: Record<Metrica, string> = {
  otorgados: "Puntos otorgados",
  utilizados: "Puntos utilizados",
  canjes: "Canjes",
  registros: "Registros de clientes",
};
const GRANULARIDAD = { dia: "por día", semana: "por semana", mes: "por mes" };

/** Desglose que origina la tendencia (F5-FE-02, A11 «Ver registros»). */
function enlaceDesglose(m: Metrica, f: FiltroPeriodo) {
  const q = new URLSearchParams({ desde: f.desde, hasta: f.hasta });
  if (f.marca) q.set("marca", f.marca);
  if (m === "registros") return "/admin/clientes";
  if (m === "canjes") return `/admin/reporte-canjes?${q}`;
  q.set("tipo", m === "otorgados" ? "otorgamiento" : "canje");
  return `/admin/movimientos?${q}`;
}

/** UI-10 Tendencias (A11): periodo actual contra el anterior y por marca. */
export function TendenciasAdmin() {
  const sesion = useSesion();
  const me = usePerfil();
  const [metrica, setMetrica] = useState<Metrica>("otorgados");
  const [filtro, setFiltro] = useState<FiltroPeriodo>(filtroInicial());
  const { carga, recargar } = useCarga(
    () =>
      getTendencias(sesion.api(), {
        metrica,
        desde: filtro.desde,
        hasta: filtro.hasta,
        marca: filtro.marca,
      }),
    [me.uid, metrica, filtro.desde, filtro.hasta, filtro.marca],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Tendencias"
          descripcion="Evolución del programa y comparación con el periodo anterior."
        />
        <Button variant="outline" className="h-10" onClick={recargar}>
          <RefreshCw aria-hidden="true" /> Actualizar
        </Button>
      </div>
      <Tarjeta>
        <div
          role="group"
          aria-label="Indicador"
          className="flex flex-wrap gap-2"
        >
          {(Object.keys(NOMBRE_METRICA) as Metrica[]).map((m) => (
            <Chip key={m} activo={metrica === m} onClick={() => setMetrica(m)}>
              {NOMBRE_METRICA[m]}
            </Chip>
          ))}
        </div>
        <FiltrosPeriodo
          valor={filtro}
          onCambio={setFiltro}
          presets={["7d", "30d", "6m", "personalizado"]}
        />
      </Tarjeta>
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="la tendencia"
        alto="h-96"
      >
        {(r) => {
          const n = Math.max(r.actual.serie.length, r.anterior.serie.length);
          const datos = Array.from({ length: n }, (_, i) => ({
            etiqueta: r.actual.serie[i]
              ? etiquetaCubeta(r.actual.serie[i]!.desde, r.granularidad)
              : `#${i + 1}`,
            actual: r.actual.serie[i]?.valor ?? 0,
            anterior: r.anterior.serie[i]?.valor ?? 0,
          }));
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Tarjeta titulo="Periodo actual">
                  <p
                    className="text-3xl font-extrabold"
                    data-testid="total-actual"
                  >
                    {formatoPuntos(r.actual.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {textoRango(r.actual.desde, r.actual.hasta)}
                  </p>
                </Tarjeta>
                <Tarjeta titulo="Periodo anterior">
                  <p className="text-3xl font-extrabold text-muted-foreground">
                    {formatoPuntos(r.anterior.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {textoRango(r.anterior.desde, r.anterior.hasta)}
                  </p>
                </Tarjeta>
                <Tarjeta titulo="Variación">
                  <p className="flex items-center gap-2 text-3xl font-extrabold">
                    {r.variacion.absoluta >= 0 ? "+" : "−"}
                    {formatoPuntos(Math.abs(r.variacion.absoluta))}
                    <TextoVariacion v={r.variacion} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {NOMBRE_METRICA[r.metrica]}
                  </p>
                </Tarjeta>
              </div>
              <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
                <Tarjeta
                  titulo={`${NOMBRE_METRICA[r.metrica]} ${GRANULARIDAD[r.granularidad]}${r.marca ? ` · ${NOMBRE_MARCA[r.marca]}` : ""}`}
                >
                  <GraficoLineas
                    titulo={`${NOMBRE_METRICA[r.metrica]}: periodo actual y anterior`}
                    datos={datos}
                    series={[
                      {
                        clave: "actual",
                        nombre: "Actual",
                        color: "var(--chart-1)",
                      },
                      {
                        clave: "anterior",
                        nombre: "Anterior",
                        color: "var(--muted-foreground)",
                        discontinua: true,
                      },
                    ]}
                  />
                </Tarjeta>
                <Tarjeta titulo="Comparación entre marcas">
                  <GraficoBarras
                    titulo={`${NOMBRE_METRICA[r.metrica]} por marca en el periodo actual`}
                    datos={[
                      Object.fromEntries([
                        ["etiqueta", "Periodo"],
                        ...r.porMarca.map((m) => [m.marca, m.total]),
                      ]),
                    ]}
                    series={r.porMarca.map((m) => ({
                      clave: m.marca,
                      nombre: NOMBRE_MARCA[m.marca],
                      color: COLOR_MARCA[m.marca],
                    }))}
                  />
                </Tarjeta>
              </div>
              <Link
                href={enlaceDesglose(r.metrica, filtro)}
                className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <List aria-hidden="true" className="size-4" />
                Ver los registros que originan la tendencia
              </Link>
            </>
          );
        }}
      </EstadoCarga>
    </div>
  );
}

"use client";

import { Activity, Gift, RefreshCw, Star, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EtiquetaEstadoCanje } from "@/components/cliente/beneficio-visual";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { getResumen } from "@/lib/api/reportes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { etiquetaCubeta, textoRango } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import {
  BarraProporcion,
  COLOR_MARCA,
  GraficoBarras,
  GraficoLineas,
  TarjetaKpi,
} from "./reportes-comun";

/**
 * UI-21 Dashboard (A13, SRC-02 pp. 5–6): KPI de los últimos 30 días frente a
 * los 30 anteriores, cada uno enlazado a su desglose; se lee al abrir y con
 * «Actualizar» (DEC-09).
 */
export function Dashboard() {
  const sesion = useSesion();
  const me = usePerfil();
  const { carga, recargar } = useCarga(
    () => getResumen(sesion.api()),
    [me.uid],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Dashboard"
          descripcion="Resumen del programa de fidelización · Zontes, Kiden y NIU."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10" onClick={recargar}>
            <RefreshCw aria-hidden="true" /> Actualizar
          </Button>
          <Link
            href="/admin/actividad"
            className={buttonVariants({
              variant: "outline",
              className: "h-10",
            })}
          >
            <Activity aria-hidden="true" /> Ver reporte de actividad
          </Link>
        </div>
      </div>
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="el resumen"
        alto="h-96"
      >
        {(r) => {
          const ultimos30 = `?desde=${r.periodo.desde}&hasta=${r.periodo.hasta}`;
          return (
            <>
              <p className="-mt-4 text-sm text-muted-foreground">
                Indicadores de {textoRango(r.periodo.desde, r.periodo.hasta)},
                comparados con los 30 días anteriores.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TarjetaKpi
                  titulo="Clientes registrados"
                  valor={r.clientes.total}
                  detalle={`${r.clientes.vinculados} vinculados · ${r.clientes.sinVincular} sin vincular · ${r.clientes.nuevos.valor} nuevos en 30 días`}
                  variacion={r.clientes.nuevos.variacion}
                  icono={Users}
                  href="/admin/clientes"
                />
                <TarjetaKpi
                  titulo="Puntos otorgados"
                  valor={r.puntosOtorgados.valor}
                  detalle="Últimos 30 días"
                  variacion={r.puntosOtorgados.variacion}
                  icono={Star}
                  href={`/admin/movimientos${ultimos30}&tipo=otorgamiento`}
                />
                <TarjetaKpi
                  titulo="Puntos utilizados"
                  valor={r.puntosUtilizados.valor}
                  detalle={`${formatoPuntos(r.puntosUtilizados.vencidos)} pts vencidos en 30 días`}
                  variacion={r.puntosUtilizados.variacion}
                  icono={Wallet}
                  href={`/admin/movimientos${ultimos30}&tipo=canje`}
                />
                <TarjetaKpi
                  titulo="Canjes realizados"
                  valor={r.canjes.valor}
                  detalle={`${r.canjes.pendientesDeEntrega} pendientes de entrega`}
                  variacion={r.canjes.variacion}
                  icono={Gift}
                  href={`/admin/reporte-canjes${ultimos30}`}
                />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Tarjeta titulo="Actividad de puntos · últimos 6 meses">
                  <GraficoLineas
                    titulo="Puntos otorgados y utilizados por mes"
                    datos={r.actividadMensual.map((m) => ({
                      etiqueta: etiquetaCubeta(m.desde, "mes"),
                      otorgados: m.otorgados,
                      utilizados: m.utilizados,
                    }))}
                    series={[
                      {
                        clave: "otorgados",
                        nombre: "Otorgados",
                        color: "var(--chart-1)",
                      },
                      {
                        clave: "utilizados",
                        nombre: "Utilizados",
                        color: "var(--chart-2)",
                        discontinua: true,
                      },
                    ]}
                  />
                </Tarjeta>
                <Tarjeta titulo="Canjes por marca · últimos 6 meses">
                  <GraficoBarras
                    titulo="Canjes por marca y mes"
                    apiladas
                    datos={r.canjesMensualesPorMarca.map((m) => ({
                      etiqueta: etiquetaCubeta(m.desde, "mes"),
                      zontes: m.zontes,
                      kiden: m.kiden,
                      niu: m.niu,
                    }))}
                    series={(["zontes", "kiden", "niu"] as const).map((m) => ({
                      clave: m,
                      nombre: NOMBRE_MARCA[m],
                      color: COLOR_MARCA[m],
                    }))}
                  />
                </Tarjeta>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Tarjeta
                  titulo="Últimos clientes registrados"
                  accion={
                    <Link
                      href="/admin/clientes"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Ver todos
                    </Link>
                  }
                >
                  <ul
                    className="divide-y"
                    aria-label="Últimos clientes registrados"
                  >
                    {r.ultimosRegistros.length === 0 && (
                      <li className="py-2 text-sm text-muted-foreground">
                        Sin registros en los últimos 6 meses.
                      </li>
                    )}
                    {r.ultimosRegistros.map((c) => (
                      <li
                        key={c.uid}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {c.nombre || "Sin nombre"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.vinculo === "vinculado"
                              ? "Vinculado"
                              : "Sin vincular"}{" "}
                            · {formatoFecha(c.creadoEn)}
                          </span>
                        </span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {c.marcas.map((m) => (
                            <Badge key={m} variant="secondary">
                              {NOMBRE_MARCA[m]}
                            </Badge>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
                <Tarjeta
                  titulo="Últimos canjes"
                  accion={
                    <Link
                      href="/admin/reporte-canjes"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Ver todos
                    </Link>
                  }
                >
                  <ul className="divide-y" aria-label="Últimos canjes">
                    {r.ultimosCanjes.length === 0 && (
                      <li className="py-2 text-sm text-muted-foreground">
                        Sin canjes en los últimos 6 meses.
                      </li>
                    )}
                    {r.ultimosCanjes.map((c) => (
                      <li
                        key={c.codigo}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {c.beneficioNombre}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.cliente ?? "—"} · {formatoPuntos(c.puntos)} pts
                          </span>
                        </span>
                        <EtiquetaEstadoCanje valor={c.estado} />
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
                <Tarjeta titulo="Clientes por marca">
                  <ul
                    className="flex flex-col gap-3"
                    aria-label="Clientes por marca"
                  >
                    {r.clientes.porMarca.map((m) => (
                      <li key={m.marca} className="flex flex-col gap-1">
                        <span className="flex justify-between text-sm">
                          <span className="font-medium">
                            {NOMBRE_MARCA[m.marca]}
                          </span>
                          <span>{formatoPuntos(m.clientes)}</span>
                        </span>
                        <BarraProporcion
                          valor={m.clientes}
                          maximo={Math.max(1, r.clientes.total)}
                          color={COLOR_MARCA[m.marca]}
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Un cliente puede estar vinculado a varias marcas.
                  </p>
                </Tarjeta>
              </div>
            </>
          );
        }}
      </EstadoCarga>
    </div>
  );
}

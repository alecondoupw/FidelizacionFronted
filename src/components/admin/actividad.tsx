"use client";

import {
  Activity,
  Gift,
  Hourglass,
  RefreshCw,
  Star,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { getActividad } from "@/lib/api/reportes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoPuntos, NOMBRE_EVENTO } from "@/lib/formato";
import { textoRango } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import {
  BarraProporcion,
  FiltrosPeriodo,
  filtroInicial,
  TarjetaKpi,
  type FiltroPeriodo,
} from "./reportes-comun";

const consulta = (f: FiltroPeriodo, extra: Record<string, string> = {}) =>
  `?${new URLSearchParams({
    desde: f.desde,
    hasta: f.hasta,
    ...(f.marca ? { marca: f.marca } : {}),
    ...extra,
  })}`;

/** UI-08 Actividad (A10, SRC-02 pp. 5–6): KPI que abren los movimientos. */
export function ActividadAdmin() {
  const sesion = useSesion();
  const me = usePerfil();
  const [filtro, setFiltro] = useState<FiltroPeriodo>(filtroInicial());
  const { carga, recargar } = useCarga(
    () =>
      getActividad(sesion.api(), {
        desde: filtro.desde,
        hasta: filtro.hasta,
        marca: filtro.marca,
      }),
    [me.uid, filtro.desde, filtro.hasta, filtro.marca],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Reporte de actividad"
          descripcion={textoRango(filtro.desde, filtro.hasta)}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10" onClick={recargar}>
            <RefreshCw aria-hidden="true" /> Actualizar
          </Button>
          <Link
            href={`/admin/exportar${consulta(filtro, { tipo: "actividad" })}`}
            className={buttonVariants({
              variant: "outline",
              className: "h-10",
            })}
          >
            Exportar
          </Link>
        </div>
      </div>
      <Tarjeta>
        <FiltrosPeriodo valor={filtro} onCambio={setFiltro} />
      </Tarjeta>
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="la actividad"
        alto="h-80"
      >
        {(r) => {
          const movimientos = (extra: Record<string, string> = {}) =>
            `/admin/movimientos${consulta(filtro, extra)}`;
          const maximo = Math.max(...r.porEvento.map((e) => e.puntos), 1);
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <TarjetaKpi
                  titulo="Usuarios con actividad"
                  valor={r.usuariosConActividad}
                  detalle="Clientes con eventos, canjes o ajustes"
                  icono={Users}
                  href={movimientos()}
                />
                <TarjetaKpi
                  titulo="Nuevos registros"
                  valor={r.nuevosRegistros}
                  icono={UserPlus}
                  href="/admin/clientes"
                />
                <TarjetaKpi
                  titulo="Puntos generados"
                  valor={r.puntosGenerados}
                  detalle={`Ajustes: +${formatoPuntos(r.ajustes.positivos)} / −${formatoPuntos(r.ajustes.negativos)}`}
                  icono={Star}
                  href={movimientos({ tipo: "otorgamiento" })}
                />
                <TarjetaKpi
                  titulo="Puntos utilizados"
                  valor={r.puntosUtilizados}
                  detalle="Canjes, neto de anulaciones"
                  icono={Wallet}
                  href={movimientos({ tipo: "canje" })}
                />
                <TarjetaKpi
                  titulo="Puntos vencidos"
                  valor={r.puntosVencidos}
                  icono={Hourglass}
                  href={movimientos({ tipo: "vencimiento" })}
                />
                <TarjetaKpi
                  titulo="Canjes"
                  valor={r.canjes}
                  detalle={`${r.canjesAnulados} anulados`}
                  icono={Gift}
                  href={`/admin/reporte-canjes${consulta(filtro)}`}
                />
                <TarjetaKpi
                  titulo="Actividades registradas"
                  valor={r.actividadesRegistradas}
                  detalle="Eventos que otorgaron puntos"
                  icono={Activity}
                  href={movimientos({ tipo: "otorgamiento" })}
                />
              </div>
              <Tarjeta titulo="Actividad por tipo de evento">
                <ul
                  className="flex flex-col gap-4"
                  aria-label="Actividad por tipo de evento"
                >
                  {r.porEvento.map((e) => (
                    <li
                      key={e.evento}
                      className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:gap-4"
                    >
                      <Link
                        href={movimientos({
                          tipo: "otorgamiento",
                          evento: e.evento,
                        })}
                        className="font-medium hover:underline"
                      >
                        {NOMBRE_EVENTO[e.evento]}
                      </Link>
                      <BarraProporcion valor={e.puntos} maximo={maximo} />
                      <span className="text-sm text-muted-foreground sm:text-right">
                        <span className="font-semibold text-foreground">
                          {e.movimientos}
                        </span>{" "}
                        mov. · {formatoPuntos(e.puntos)} pts · {e.clientes}{" "}
                        {e.clientes === 1 ? "cliente" : "clientes"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            </>
          );
        }}
      </EstadoCarga>
    </div>
  );
}

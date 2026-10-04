"use client";

import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Marca } from "@/lib/api/contract";
import type { Evento } from "@/lib/api/puntos";
import {
  getMovimientos,
  type MovimientoGlobal,
  type TipoMovimiento,
} from "@/lib/api/reportes";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoFechaHora,
  formatoPuntosConSigno,
  NOMBRE_EVENTO,
  NOMBRE_TIPO,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { textoRango } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";
import {
  Chip,
  FiltrosPeriodo,
  filtroInicial,
  type FiltroPeriodo,
} from "./reportes-comun";

const POR_PAGINA = 25;
type Clase = { tipo?: TipoMovimiento; evento?: Evento };
const CLASES: { texto: string; valor: Clase }[] = [
  { texto: "Todos", valor: {} },
  ...(Object.keys(NOMBRE_EVENTO) as Evento[]).map((e) => ({
    texto: NOMBRE_EVENTO[e],
    valor: { tipo: "otorgamiento" as const, evento: e },
  })),
  { texto: "Acumulaciones", valor: { tipo: "otorgamiento" } },
  { texto: "Canje", valor: { tipo: "canje" } },
  { texto: "Vencimiento", valor: { tipo: "vencimiento" } },
  { texto: "Ajuste", valor: { tipo: "ajuste" } },
];
const igual = (a: Clase, b: Clase) =>
  a.tipo === b.tipo && a.evento === b.evento;

export interface FiltroInicialMovimientos {
  desde?: string;
  hasta?: string;
  marca?: Marca;
  tipo?: TipoMovimiento;
  evento?: Evento;
}

const descripcion = (m: MovimientoGlobal) =>
  m.motivo ?? (m.evento ? NOMBRE_EVENTO[m.evento] : NOMBRE_TIPO[m.tipo]);

/**
 * UI-20 Movimientos (A07): libro global del más reciente al más antiguo; es
 * el desglose al que llevan los KPI de Dashboard y Actividad.
 */
export function MovimientosAdmin({
  inicial,
}: {
  inicial: FiltroInicialMovimientos;
}) {
  const sesion = useSesion();
  const me = usePerfil();
  const [filtro, setFiltro] = useState<FiltroPeriodo>(() =>
    inicial.desde && inicial.hasta
      ? {
          preset: "personalizado",
          desde: inicial.desde,
          hasta: inicial.hasta,
          marca: inicial.marca,
        }
      : { ...filtroInicial(), marca: inicial.marca },
  );
  const [clase, setClase] = useState<Clase>({
    tipo: inicial.tipo,
    evento: inicial.evento,
  });
  const [extra, setExtra] = useState<{
    items: MovimientoGlobal[];
    siguiente: string | null;
  } | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState<string | null>(null);
  const consulta = {
    desde: filtro.desde,
    hasta: filtro.hasta,
    marca: filtro.marca,
    tipo: clase.tipo,
    evento: clase.evento,
  };
  const primera = useCarga(
    () => getMovimientos(sesion.api(), { ...consulta, limite: POR_PAGINA }),
    [me.uid, JSON.stringify(consulta)],
  );
  // Lleva los mismos filtros a la exportación (A12).
  const exportar = new URLSearchParams({
    tipo: "movimientos",
    desde: filtro.desde,
    hasta: filtro.hasta,
  });
  if (filtro.marca) exportar.set("marca", filtro.marca);
  if (clase.tipo) exportar.set("tipoMovimiento", clase.tipo);
  if (clase.evento) exportar.set("evento", clase.evento);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Movimientos de puntos"
          descripcion={`Puntos de reglas, canjes, vencimientos y ajustes · ${textoRango(filtro.desde, filtro.hasta)}`}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10" onClick={primera.recargar}>
            <RefreshCw aria-hidden="true" /> Actualizar
          </Button>
          <Link
            href={`/admin/exportar?${exportar}`}
            className={buttonVariants({
              variant: "outline",
              className: "h-10",
            })}
          >
            <Download aria-hidden="true" /> Exportar
          </Link>
        </div>
      </div>
      <Tarjeta>
        <div
          role="group"
          aria-label="Tipo de movimiento"
          className="flex flex-wrap gap-2"
        >
          {CLASES.map((c) => (
            <Chip
              key={c.texto}
              activo={igual(clase, c.valor)}
              onClick={() => {
                setExtra(null);
                setClase(c.valor);
              }}
            >
              {c.texto}
            </Chip>
          ))}
        </div>
        <FiltrosPeriodo
          valor={filtro}
          onCambio={(f) => {
            setExtra(null);
            setFiltro(f);
          }}
        />
        <EstadoCarga
          carga={primera.carga}
          recargar={primera.recargar}
          etiqueta="los movimientos"
        >
          {(p) => {
            const items = [...p.items, ...(extra?.items ?? [])];
            const siguiente = extra ? extra.siguiente : p.siguiente;
            if (items.length === 0) {
              return (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay movimientos con estos filtros.
                </p>
              );
            }
            return (
              <div className="flex flex-col gap-4">
                <ul aria-label="Movimientos" className="divide-y">
                  {items.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-col gap-1 py-3 lg:flex-row lg:items-center lg:gap-4"
                    >
                      <span className="text-xs text-muted-foreground lg:w-36">
                        {formatoFechaHora(m.fecha)}
                      </span>
                      <span className="min-w-0 lg:w-48">
                        <span className="block truncate font-medium">
                          {m.cliente.nombre || "Sin nombre"}
                        </span>
                        {m.cliente.correo && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {m.cliente.correo}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        {descripcion(m)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">{NOMBRE_TIPO[m.tipo]}</Badge>
                        <Badge variant="outline">{NOMBRE_MARCA[m.marca]}</Badge>
                        <span
                          className={cn(
                            "w-20 text-right font-bold",
                            m.puntos > 0 ? "text-exito" : "text-foreground",
                          )}
                        >
                          {formatoPuntosConSigno(m.puntos)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                {errorMas && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorMas}
                  </p>
                )}
                {siguiente && (
                  <Button
                    variant="outline"
                    className="self-center"
                    disabled={cargandoMas}
                    onClick={async () => {
                      setCargandoMas(true);
                      setErrorMas(null);
                      try {
                        const mas = await getMovimientos(sesion.api(), {
                          ...consulta,
                          limite: POR_PAGINA,
                          cursor: siguiente,
                        });
                        setExtra({
                          items: [...(extra?.items ?? []), ...mas.items],
                          siguiente: mas.siguiente,
                        });
                      } catch (e) {
                        setErrorMas(mensajeError(e));
                      } finally {
                        setCargandoMas(false);
                      }
                    }}
                  >
                    {cargandoMas ? "Cargando…" : "Cargar más"}
                  </Button>
                )}
              </div>
            );
          }}
        </EstadoCarga>
      </Tarjeta>
    </div>
  );
}

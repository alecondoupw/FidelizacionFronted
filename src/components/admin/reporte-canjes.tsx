"use client";

import { Download, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EtiquetaEstadoCanje } from "@/components/cliente/beneficio-visual";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EstadoCanje } from "@/lib/api/canjes";
import type { Marca } from "@/lib/api/contract";
import { getReporteCanjes, type ReporteCanjes } from "@/lib/api/reportes";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoFecha,
  formatoPuntos,
  NOMBRE_ESTADO_CANJE,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { textoRango } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import {
  BarraProporcion,
  Chip,
  COLOR_MARCA,
  FiltrosPeriodo,
  filtroInicial,
  type FiltroPeriodo,
} from "./reportes-comun";

const POR_PAGINA = 20;

/** UI-09 Reporte de canjes (A08): totales, ranking, marcas y detalle trazable. */
export function ReporteCanjesAdmin({
  inicial,
}: {
  inicial: { desde?: string; hasta?: string; marca?: Marca };
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
  const [estado, setEstado] = useState<EstadoCanje | undefined>();
  const [texto, setTexto] = useState("");
  const [correo, setCorreo] = useState<string | undefined>();
  const [extra, setExtra] = useState<ReporteCanjes["items"] | null>(null);
  const [siguienteExtra, setSiguienteExtra] = useState<string | null>(null);
  const [errorMas, setErrorMas] = useState<string | null>(null);
  const consulta = {
    desde: filtro.desde,
    hasta: filtro.hasta,
    marca: filtro.marca,
    estado,
    correo,
  };
  const { carga, recargar } = useCarga(
    () => getReporteCanjes(sesion.api(), { ...consulta, limite: POR_PAGINA }),
    [me.uid, JSON.stringify(consulta)],
  );
  const reiniciar = () => {
    setExtra(null);
    setSiguienteExtra(null);
  };
  const exportar = new URLSearchParams({
    tipo: "canjes",
    desde: filtro.desde,
    hasta: filtro.hasta,
  });
  if (filtro.marca) exportar.set("marca", filtro.marca);
  if (estado) exportar.set("estado", estado);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Reporte de canjes"
          descripcion={`Total, detalle y trazabilidad de cada canje · ${textoRango(filtro.desde, filtro.hasta)}`}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10" onClick={recargar}>
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
        <FiltrosPeriodo
          valor={filtro}
          onCambio={(f) => {
            reiniciar();
            setFiltro(f);
          }}
        />
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {(
            [undefined, "emitido", "entregado", "vencido", "anulado"] as const
          ).map((e) => (
            <Chip
              key={e ?? "todos"}
              activo={estado === e}
              onClick={() => {
                reiniciar();
                setEstado(e);
              }}
            >
              {e ? NOMBRE_ESTADO_CANJE[e] : "Todos"}
            </Chip>
          ))}
        </div>
        <form
          role="search"
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            reiniciar();
            setCorreo(texto.trim() || undefined);
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="canjes-correo">Cliente (correo completo)</Label>
            <Input
              id="canjes-correo"
              type="email"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="h-10"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-10">
              <Search aria-hidden="true" /> Buscar
            </Button>
            {correo && (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => {
                  setTexto("");
                  reiniciar();
                  setCorreo(undefined);
                }}
              >
                <X aria-hidden="true" /> Limpiar
              </Button>
            )}
          </div>
        </form>
      </Tarjeta>
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="el reporte de canjes"
        alto="h-80"
      >
        {(r) => {
          const items = [...r.items, ...(extra ?? [])];
          const siguiente = extra ? siguienteExtra : r.siguiente;
          const maxTop = Math.max(
            ...r.beneficiosMasCanjeados.map((b) => b.canjes),
            1,
          );
          const maxMarca = Math.max(...r.porMarca.map((m) => m.puntos), 1);
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Tarjeta titulo="Total de canjes">
                  <p
                    className="text-3xl font-extrabold"
                    data-testid="total-canjes"
                  >
                    {formatoPuntos(r.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.validos} válidos · {r.anulados} anulados
                  </p>
                </Tarjeta>
                <Tarjeta titulo="Puntos utilizados">
                  <p className="text-3xl font-extrabold">
                    {formatoPuntos(r.puntosUtilizados)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Suma de canjes válidos
                  </p>
                </Tarjeta>
                <Tarjeta titulo="Clientes con canjes">
                  <p className="text-3xl font-extrabold">
                    {formatoPuntos(r.clientesConCanjes)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    En el periodo seleccionado
                  </p>
                </Tarjeta>
                <Tarjeta titulo="Beneficio más canjeado">
                  <p
                    className="truncate text-xl font-extrabold"
                    title={r.beneficiosMasCanjeados[0]?.nombre}
                  >
                    {r.beneficiosMasCanjeados[0]?.nombre ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.beneficiosMasCanjeados[0]
                      ? `${r.beneficiosMasCanjeados[0].canjes} canjes`
                      : "Sin canjes válidos"}
                  </p>
                </Tarjeta>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Tarjeta titulo="Beneficios más canjeados">
                  <ol
                    className="flex flex-col gap-3"
                    aria-label="Beneficios más canjeados"
                  >
                    {r.beneficiosMasCanjeados.length === 0 && (
                      <li className="text-sm text-muted-foreground">
                        Sin canjes válidos.
                      </li>
                    )}
                    {r.beneficiosMasCanjeados.map((b, i) => (
                      <li
                        key={b.beneficioId}
                        className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 text-sm"
                      >
                        <span className="text-muted-foreground">{i + 1}</span>
                        <span className="flex flex-col gap-1">
                          <span className="truncate font-medium">
                            {b.nombre}
                          </span>
                          <BarraProporcion valor={b.canjes} maximo={maxTop} />
                        </span>
                        <span className="font-bold">{b.canjes}</span>
                      </li>
                    ))}
                  </ol>
                </Tarjeta>
                <Tarjeta titulo="Comparación por marca">
                  <ul
                    className="flex flex-col gap-3"
                    aria-label="Canjes por marca"
                  >
                    {r.porMarca.map((m) => (
                      <li key={m.marca} className="flex flex-col gap-1 text-sm">
                        <span className="flex justify-between">
                          <span className="font-medium">
                            {NOMBRE_MARCA[m.marca]}
                          </span>
                          <span>
                            {formatoPuntos(m.puntos)} pts · {m.canjes}{" "}
                            {m.canjes === 1 ? "canje" : "canjes"}
                          </span>
                        </span>
                        <BarraProporcion
                          valor={m.puntos}
                          maximo={maxMarca}
                          color={COLOR_MARCA[m.marca]}
                        />
                      </li>
                    ))}
                  </ul>
                </Tarjeta>
              </div>
              <Tarjeta titulo="Detalle de canjes">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No hay canjes con estos filtros.
                  </p>
                ) : (
                  <ul aria-label="Detalle de canjes" className="divide-y">
                    {items.map((c) => (
                      <li
                        key={c.codigo}
                        className="flex flex-col gap-1 py-3 lg:flex-row lg:items-center lg:gap-4"
                      >
                        <span className="font-mono text-sm lg:w-40">
                          {c.codigo}
                        </span>
                        <span className="min-w-0 lg:w-48">
                          <span className="block truncate font-medium">
                            {c.cliente.nombre || "Sin nombre"}
                          </span>
                          {c.cliente.correo && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.cliente.correo}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {c.beneficioNombre}
                        </span>
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {NOMBRE_MARCA[c.marca]}
                          </Badge>
                          <span className="w-20 text-right font-bold">
                            {formatoPuntos(c.puntos)} pts
                          </span>
                          <span className="w-24 text-xs text-muted-foreground">
                            {formatoFecha(c.emitidoEn)}
                          </span>
                          <EtiquetaEstadoCanje valor={c.estado} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {errorMas && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorMas}
                  </p>
                )}
                {siguiente && (
                  <Button
                    variant="outline"
                    className="self-center"
                    onClick={async () => {
                      setErrorMas(null);
                      try {
                        const mas = await getReporteCanjes(sesion.api(), {
                          ...consulta,
                          limite: POR_PAGINA,
                          cursor: siguiente,
                        });
                        setExtra([...(extra ?? []), ...mas.items]);
                        setSiguienteExtra(mas.siguiente);
                      } catch (e) {
                        setErrorMas(mensajeError(e));
                      }
                    }}
                  >
                    Cargar más
                  </Button>
                )}
              </Tarjeta>
            </>
          );
        }}
      </EstadoCarga>
    </div>
  );
}

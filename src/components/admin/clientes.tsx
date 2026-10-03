"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Marca } from "@/lib/api/contract";
import {
  getClientes,
  type Cliente,
  type FiltroClientes,
} from "@/lib/api/identidades";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";

const POR_PAGINA = 20;

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

export function EtiquetaVinculo({ c }: { c: Pick<Cliente, "vinculo"> }) {
  return c.vinculo === "vinculado" ? (
    <Badge className="bg-exito-suave text-exito">Vinculado</Badge>
  ) : (
    <Badge variant="secondary">No vinculado</Badge>
  );
}

export function EtiquetaEstado({ activo }: { activo: boolean }) {
  return activo ? (
    <Badge className="bg-exito-suave text-exito">Activo</Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground">Inactivo</Badge>
  );
}

/**
 * UI-07 Clientes (A01, SRC-02 p. 3). Los clientes se registran desde su
 * propio flujo; aquí se gestionan. La búsqueda es por correo completo (el
 * mismo índice del vínculo); exportar llega con los reportes (F5).
 */
export function Clientes() {
  const sesion = useSesion();
  const me = usePerfil();
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<FiltroClientes>({});
  const [extra, setExtra] = useState<{
    items: Cliente[];
    siguiente: string | null;
  } | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState<string | null>(null);
  const primera = useCarga(
    () => getClientes(sesion.api(), { ...filtro, limite: POR_PAGINA }),
    [me.uid, JSON.stringify(filtro)],
  );

  const cambiar = (cambio: Partial<FiltroClientes>) => {
    setExtra(null);
    setFiltro((f) => ({ ...f, ...cambio }));
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion="Los clientes se registran desde su propio flujo; aquí gestionas las cuentas existentes."
      />
      <Tarjeta>
        <form
          role="search"
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            cambiar({ correo: texto.trim() || undefined });
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="buscar-correo">Buscar por correo completo</Label>
            <Input
              id="buscar-correo"
              type="email"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="cliente@correo.com"
              className="h-10"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="h-10">
              <Search aria-hidden="true" /> Buscar
            </Button>
            {filtro.correo && (
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => {
                  setTexto("");
                  cambiar({ correo: undefined });
                }}
              >
                <X aria-hidden="true" /> Limpiar
              </Button>
            )}
          </div>
        </form>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div role="group" aria-label="Marca" className="flex flex-wrap gap-2">
            {([undefined, "zontes", "kiden", "niu"] as const).map((m) => (
              <Chip
                key={m ?? "todas"}
                activo={filtro.marca === m}
                onClick={() => cambiar({ marca: m as Marca | undefined })}
              >
                {m ? NOMBRE_MARCA[m] : "Todas las marcas"}
              </Chip>
            ))}
          </div>
          <div
            role="group"
            aria-label="Estado"
            className="flex flex-wrap gap-2"
          >
            {(
              [
                [undefined, "Todos"],
                [true, "Activos"],
                [false, "Inactivos"],
              ] as const
            ).map(([v, t]) => (
              <Chip
                key={t}
                activo={filtro.activo === v}
                onClick={() => cambiar({ activo: v })}
              >
                {t}
              </Chip>
            ))}
          </div>
          <div
            role="group"
            aria-label="Vinculación"
            className="flex flex-wrap gap-2"
          >
            {(
              [
                [undefined, "Con y sin vínculo"],
                ["vinculado", "Vinculados"],
                ["no_vinculado", "No vinculados"],
              ] as const
            ).map(([v, t]) => (
              <Chip
                key={t}
                activo={filtro.vinculo === v}
                onClick={() => cambiar({ vinculo: v })}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <EstadoCarga
          carga={primera.carga}
          recargar={primera.recargar}
          etiqueta="los clientes"
        >
          {(p) => {
            const items = [...p.items, ...(extra?.items ?? [])];
            const siguiente = extra ? extra.siguiente : p.siguiente;
            if (items.length === 0) {
              return (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {filtro.correo
                    ? "No hay un cliente con ese correo y filtros."
                    : "No hay clientes que coincidan con los filtros."}
                </p>
              );
            }
            return (
              <div className="flex flex-col gap-4">
                <ul aria-label="Clientes" className="divide-y">
                  {items.map((c) => (
                    <li
                      key={c.uid}
                      className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {c.nombre || "Sin nombre"}
                        </p>
                        <p className="text-sm break-all text-muted-foreground">
                          {c.correo}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                        <span className="flex flex-wrap gap-1">
                          {c.marcas.length ? (
                            c.marcas.map((m) => (
                              <Badge key={m} variant="secondary">
                                {NOMBRE_MARCA[m]}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Sin marcas
                            </span>
                          )}
                        </span>
                        <EtiquetaVinculo c={c} />
                        <span className="w-20 text-sm font-bold lg:text-right">
                          {formatoPuntos(c.puntos)} pts
                        </span>
                        <span className="text-xs text-muted-foreground lg:w-24">
                          {c.creadoEn ? formatoFecha(c.creadoEn) : "—"}
                        </span>
                        <EtiquetaEstado activo={c.activo} />
                        <Link
                          href={`/admin/clientes/${encodeURIComponent(c.uid)}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          aria-label={`Gestionar a ${c.nombre || c.correo}`}
                        >
                          Gestionar
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </div>
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
                        const mas = await getClientes(sesion.api(), {
                          ...filtro,
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

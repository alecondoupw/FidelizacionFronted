"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { getMisCanjes, type CanjeVista } from "@/lib/api/canjes";
import type { Marca } from "@/lib/api/contract";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";
import { EtiquetaEstadoCanje } from "./beneficio-visual";

const POR_PAGINA = 20;

/** UI-15 Mis canjes (C04, SRC-03 p. 7): sólo los del propietario, filtrables por marca. */
export function MisCanjes() {
  const sesion = useSesion();
  const me = usePerfil();
  const [marca, setMarca] = useState<Marca | undefined>();
  const [extra, setExtra] = useState<{
    items: CanjeVista[];
    siguiente: string | null;
  } | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState<string | null>(null);
  const primera = useCarga(
    () => getMisCanjes(sesion.api(), { marca, limite: POR_PAGINA }),
    [me.uid, marca],
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mis canjes"
        descripcion="Los beneficios que canjeaste, con su código, vigencia y estado."
      />
      <Tarjeta>
        <div
          role="group"
          aria-label="Marca"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {[undefined, ...me.marcas].map((m) => (
            <button
              key={m ?? "todas"}
              type="button"
              aria-pressed={marca === m}
              onClick={() => {
                setExtra(null);
                setMarca(m);
              }}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                marca === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {m ? NOMBRE_MARCA[m] : "Todas"}
            </button>
          ))}
        </div>
        <EstadoCarga
          carga={primera.carga}
          recargar={primera.recargar}
          etiqueta="tus canjes"
        >
          {(p) => {
            const items = [...p.items, ...(extra?.items ?? [])];
            const siguiente = extra ? extra.siguiente : p.siguiente;
            if (items.length === 0) {
              return (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Todavía no tienes canjes.
                  <Link
                    href="/catalogo"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Explorar el catálogo
                  </Link>
                </div>
              );
            }
            return (
              <div className="flex flex-col gap-4">
                <ul aria-label="Canjes" className="divide-y">
                  {items.map((c) => (
                    <li
                      key={c.codigo}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {c.beneficioNombre}
                          {c.varianteNombre !== "Única"
                            ? ` · ${c.varianteNombre}`
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatoFecha(c.emitidoEn)} · {NOMBRE_MARCA[c.marca]}{" "}
                          · <span className="font-mono">{c.codigo}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-24 text-sm font-bold sm:text-right">
                          {formatoPuntos(c.puntos)} pts
                        </span>
                        <EtiquetaEstadoCanje valor={c.estado} />
                        <Link
                          href={`/canjes/${encodeURIComponent(c.codigo)}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          Ver detalle{" "}
                          <span className="sr-only">del canje {c.codigo}</span>
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
                        const mas = await getMisCanjes(sesion.api(), {
                          marca,
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

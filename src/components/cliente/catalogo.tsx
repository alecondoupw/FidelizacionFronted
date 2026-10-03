"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Input } from "@/components/ui/input";
import { getCatalogo, type Categoria } from "@/lib/api/canjes";
import type { Marca } from "@/lib/api/contract";
import { useSesion } from "@/lib/auth/sesion";
import { formatoPuntos, NOMBRE_CATEGORIA } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";
import {
  EtiquetaDisponibilidad,
  IlustracionBeneficio,
} from "./beneficio-visual";

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

/**
 * UI-05 Catálogo (C06, SRC-03 p. 6): sólo beneficios de marcas vinculadas,
 * separados por marca; búsqueda, filtros y disponibilidad del backend.
 */
export function Catalogo({ marcaInicial }: { marcaInicial?: string }) {
  const sesion = useSesion();
  const me = usePerfil();
  const inicial = me.marcas.find((m) => m === marcaInicial);
  const [marca, setMarca] = useState<Marca | undefined>(inicial);
  const [categoria, setCategoria] = useState<Categoria | undefined>();
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const { carga, recargar } = useCarga(
    () => getCatalogo(sesion.api(), { marca, categoria, q: q || undefined }),
    [me.uid, marca, categoria, q],
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Catálogo de beneficios"
        descripcion="Canjea tus puntos por productos, servicios y experiencias de tus marcas vinculadas."
      />
      {me.marcas.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Necesitas al menos una marca vinculada para ver beneficios.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <label className="relative block">
              <span className="sr-only">Buscar en el catálogo</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Buscar en el catálogo…"
                className="h-10 pl-9"
              />
            </label>
            <div
              role="group"
              aria-label="Marca"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              <Chip activo={!marca} onClick={() => setMarca(undefined)}>
                Todas
              </Chip>
              {me.marcas.map((m) => (
                <Chip key={m} activo={marca === m} onClick={() => setMarca(m)}>
                  {NOMBRE_MARCA[m]}
                </Chip>
              ))}
            </div>
            <div
              role="group"
              aria-label="Categoría"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              <Chip activo={!categoria} onClick={() => setCategoria(undefined)}>
                Todas
              </Chip>
              {(Object.keys(NOMBRE_CATEGORIA) as Categoria[]).map((c) => (
                <Chip
                  key={c}
                  activo={categoria === c}
                  onClick={() => setCategoria(c)}
                >
                  {NOMBRE_CATEGORIA[c]}
                </Chip>
              ))}
            </div>
          </div>

          <EstadoCarga
            carga={carga}
            recargar={recargar}
            etiqueta="el catálogo"
            alto="h-64"
          >
            {({ items }) =>
              items.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay beneficios que coincidan con tu búsqueda.
                </p>
              ) : (
                <ul
                  aria-label="Beneficios"
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {items.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
                    >
                      <IlustracionBeneficio
                        categoria={b.categoria}
                        className="h-28"
                      />
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold tracking-wide uppercase">
                          {NOMBRE_MARCA[b.marca]}
                        </span>
                        <EtiquetaDisponibilidad valor={b.disponibilidad} />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-semibold">{b.nombre}</h2>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {b.descripcion}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold">
                          {formatoPuntos(b.puntos)}{" "}
                          <span className="text-xs font-medium text-muted-foreground">
                            puntos
                          </span>
                        </span>
                        <Link
                          href={`/catalogo/${encodeURIComponent(b.id)}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          Ver detalle{" "}
                          <span className="sr-only">de {b.nombre}</span>
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </EstadoCarga>
        </>
      )}
    </div>
  );
}

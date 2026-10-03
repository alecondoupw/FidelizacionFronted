"use client";

import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Chip } from "@/components/comun/chip";
import { EstadoCarga } from "@/components/comun/estado-carga";
import { TarjetaPublicacion } from "@/components/contenido/publicacion-visual";
import { EncabezadoPagina } from "@/components/shell/shell";
import { getContenidos } from "@/lib/api/contenidos";
import type { Marca } from "@/lib/api/contract";
import { useSesion } from "@/lib/auth/sesion";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";

/** Novedades de las marcas vinculadas (DEC-10, RN-09): sólo lo activo y vigente. */
export function Novedades({ marcaInicial }: { marcaInicial?: string }) {
  const sesion = useSesion();
  const me = usePerfil();
  const [marca, setMarca] = useState<Marca | undefined>(
    me.marcas.find((m) => m === marcaInicial),
  );
  const { carga, recargar } = useCarga(
    () => getContenidos(sesion.api(), { marca, limite: 50 }),
    [me.uid, marca],
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Novedades"
        descripcion="Noticias, eventos y promociones de tus marcas vinculadas."
      />
      {me.marcas.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Cuando tengas una marca vinculada verás aquí sus novedades.
        </p>
      ) : (
        <>
          {me.marcas.length > 1 && (
            <div
              role="group"
              aria-label="Marca"
              className="flex flex-wrap gap-2"
            >
              {[undefined, ...me.marcas].map((m) => (
                <Chip
                  key={m ?? "todas"}
                  activo={marca === m}
                  onClick={() => setMarca(m)}
                >
                  {m ? NOMBRE_MARCA[m] : "Todas"}
                </Chip>
              ))}
            </div>
          )}
          <EstadoCarga
            carga={carga}
            recargar={recargar}
            etiqueta="las novedades"
            alto="h-64"
          >
            {({ items }) =>
              items.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay novedades publicadas por ahora.
                </p>
              ) : (
                <ul
                  aria-label="Novedades"
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {items.map((p) => (
                    <li key={p.id}>
                      <TarjetaPublicacion p={p} titulo="h2" />
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

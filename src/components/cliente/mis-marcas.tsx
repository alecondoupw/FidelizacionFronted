"use client";

import { CircleCheck, Gift, Megaphone, Tags } from "lucide-react";
import Link from "next/link";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { NOMBRE_MARCA } from "@/lib/marcas";

/**
 * UI-17 Mis marcas (C02, SRC-03 pp. 4–5, 8). Sólo muestra las marcas que
 * confirma /me; cada marca enlaza a sus beneficios y novedades. F9 (DEC-20)
 * retira el control «Marca activa»; la vinculación sólo llega por el correo
 * importado de cada marca (SRC-06 p. 5 punto 8).
 */
export function MisMarcas() {
  const me = usePerfil();

  return (
    <>
      <EncabezadoPagina
        titulo="Mis marcas"
        descripcion="Gestiona en un mismo perfil las marcas vinculadas a tu cuenta."
      />

      <section
        aria-labelledby="titulo-vinculadas"
        className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-acento">
            <Tags aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="titulo-vinculadas" className="text-lg font-bold">
              Mis marcas vinculadas
            </h2>
            <p className="text-sm text-muted-foreground">
              Cada marca conserva sus puntos, beneficios y novedades por
              separado.
            </p>
          </div>
        </div>

        {me.marcas.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed p-6 text-center">
            <p className="font-semibold">Aún no tienes marcas vinculadas</p>
            <p className="text-sm text-muted-foreground">
              Las marcas se vinculan automáticamente cuando tu correo coincide
              con un registro de cliente de Zontes, Kiden o NIU.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {me.marcas.map((marca) => {
              return (
                <li
                  key={marca}
                  className="flex flex-col gap-4 rounded-xl border p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-extrabold tracking-tight uppercase">
                      {NOMBRE_MARCA[marca]}
                    </span>
                    <Badge className="bg-exito-suave text-exito">
                      <CircleCheck aria-hidden="true" />
                      Vinculada
                    </Badge>
                  </div>
                  <Link
                    href={`/catalogo?marca=${marca}`}
                    className={buttonVariants({
                      variant: "outline",
                      className: "h-9",
                    })}
                    aria-label={`Ver beneficios de ${NOMBRE_MARCA[marca]}`}
                  >
                    <Gift aria-hidden="true" />
                    Ver beneficios
                  </Link>
                  <Link
                    href={`/novedades?marca=${marca}`}
                    className={buttonVariants({
                      variant: "ghost",
                      className: "h-9",
                    })}
                    aria-label={`Ver novedades de ${NOMBRE_MARCA[marca]}`}
                  >
                    <Megaphone aria-hidden="true" />
                    Ver novedades
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="titulo-nueva"
        className="mt-4 flex flex-col gap-1 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6"
      >
        <h2 id="titulo-nueva" className="font-bold">
          ¿Te falta una marca?
        </h2>
        <p className="text-sm text-muted-foreground">
          Las marcas se vinculan solas cuando tu correo figura como cliente de
          Zontes, Kiden o NIU. Si eres cliente de otra marca y no aparece aquí,
          consulta en tu tienda.
        </p>
      </section>
    </>
  );
}

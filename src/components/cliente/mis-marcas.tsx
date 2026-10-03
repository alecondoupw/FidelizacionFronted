"use client";

import { CircleCheck, Gift, Plus, Star, Tags } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Marca } from "@/lib/api/contract";
import {
  guardarMarcaActiva,
  leerMarcaActiva,
  NOMBRE_MARCA,
} from "@/lib/marcas";
import { cn } from "@/lib/utils";

/**
 * UI-17 Mis marcas (C02, SRC-03 pp. 4–5, 8). Sólo muestra las marcas que
 * confirma /me; cada marca enlaza a su catálogo de beneficios (F3).
 */
export function MisMarcas() {
  const me = usePerfil();
  // Sólo se monta en el navegador, después de que /me responde.
  const [activa, setActiva] = useState<Marca | null>(() =>
    leerMarcaActiva(me.marcas),
  );

  const elegir = (marca: Marca) => {
    guardarMarcaActiva(marca);
    setActiva(marca);
  };

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
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <Tags aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="titulo-vinculadas" className="text-lg font-bold">
              Mis marcas vinculadas
            </h2>
            <p className="text-sm text-muted-foreground">
              Elige la marca activa para ver su información cuando esté
              disponible.
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
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {me.marcas.map((marca) => {
              const esActiva = marca === activa;
              return (
                <li
                  key={marca}
                  className={cn(
                    "flex flex-col gap-4 rounded-xl border p-4",
                    esActiva && "border-primary ring-1 ring-primary",
                  )}
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
                  {esActiva ? (
                    <p className="flex items-center gap-2 rounded-lg bg-exito-suave px-3 py-2 text-sm font-semibold text-exito">
                      <Star aria-hidden="true" className="size-4" />
                      Marca activa
                    </p>
                  ) : (
                    <Button
                      variant="secondary"
                      className="h-9"
                      onClick={() => elegir(marca)}
                    >
                      Usar como marca activa
                    </Button>
                  )}
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="titulo-nueva"
        className="mt-4 flex flex-col gap-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div>
          <h2 id="titulo-nueva" className="font-bold">
            Vincular nueva marca
          </h2>
          <p id="nota-vincular" className="text-sm text-muted-foreground">
            Todavía no está disponible: se habilitará cuando se conecte la base
            de clientes de las marcas.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-10"
          disabled
          aria-describedby="nota-vincular"
        >
          <Plus aria-hidden="true" />
          Vincular nueva marca
        </Button>
      </section>
    </>
  );
}

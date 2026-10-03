"use client";

import { ArrowRight, History, Layers, Tags } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { getMovimientos, getSaldo } from "@/lib/api/puntos";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFechaLarga } from "@/lib/formato";
import { useCarga } from "@/lib/use-carga";
import { ListaMovimientos } from "./lista-movimientos";
import { ResumenSaldo } from "./resumen-saldo";

const ACCESOS = [
  {
    href: "/puntos",
    titulo: "Mis puntos",
    texto: "Saldo por marca y vencimientos",
    icono: Layers,
  },
  {
    href: "/historial",
    titulo: "Historial",
    texto: "Todos tus movimientos",
    icono: History,
  },
  {
    href: "/marcas",
    titulo: "Mis marcas",
    texto: "Marcas vinculadas y marca activa",
    icono: Tags,
  },
];

/** UI-13 Inicio cliente (C08, SRC-03 pp. 4–5). Catálogo y canjes llegan en F3. */
export function Inicio() {
  const sesion = useSesion();
  const me = usePerfil();
  const [hoy] = useState(() => new Date());
  const api = () => sesion.api();
  const saldo = useCarga(() => getSaldo(api()), [me.uid]);
  const recientes = useCarga(
    () => getMovimientos(api(), { limite: 5 }),
    [me.uid],
  );
  const nombre = sesion.usuario?.nombre?.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {nombre ? `Hola, ${nombre}` : "Hola"}
        </h1>
        <p className="text-muted-foreground first-letter:uppercase">
          {formatoFechaLarga(hoy)}
        </p>
      </div>

      <EstadoCarga
        carga={saldo.carga}
        recargar={saldo.recargar}
        etiqueta="tu saldo"
      >
        {(s) => <ResumenSaldo saldo={s} />}
      </EstadoCarga>

      <nav aria-label="Accesos rápidos" className="grid gap-3 sm:grid-cols-3">
        {ACCESOS.map(({ href, titulo, texto, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Icono aria-hidden="true" className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{titulo}</span>
              <span className="block text-xs text-muted-foreground">
                {texto}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </nav>

      <Tarjeta
        titulo="Últimos movimientos"
        accion={
          <Link
            href="/historial"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver todos
          </Link>
        }
      >
        <EstadoCarga
          carga={recientes.carga}
          recargar={recientes.recargar}
          etiqueta="tus movimientos"
        >
          {(p) => <ListaMovimientos items={p.items} />}
        </EstadoCarga>
      </Tarjeta>
    </div>
  );
}

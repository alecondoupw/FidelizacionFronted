"use client";

import Link from "next/link";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { getMovimientos, getSaldo } from "@/lib/api/puntos";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { ListaMovimientos } from "./lista-movimientos";
import { ResumenSaldo } from "./resumen-saldo";

/** UI-03 Mis puntos (C07, SRC-03 p. 5): saldo por marca, vencimientos y movimientos recientes. */
export function MisPuntos() {
  const sesion = useSesion();
  const me = usePerfil();
  const saldo = useCarga(() => getSaldo(sesion.api()), [me.uid]);
  const recientes = useCarga(
    () => getMovimientos(sesion.api(), { limite: 10 }),
    [me.uid],
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mis puntos"
        descripcion="Tu saldo por marca y los próximos vencimientos."
      />
      <EstadoCarga
        carga={saldo.carga}
        recargar={saldo.recargar}
        etiqueta="tu saldo"
      >
        {(s) => (
          <>
            <ResumenSaldo saldo={s} />
            <Tarjeta titulo="Vencimientos por marca">
              <ul className="divide-y">
                {s.marcas.map((m) => (
                  <li
                    key={m.marca}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                  >
                    <span className="font-semibold">
                      {NOMBRE_MARCA[m.marca]}
                    </span>
                    <span className="text-muted-foreground">
                      {m.proximoVencimiento
                        ? `${formatoPuntos(m.proximoVencimiento.puntos)} vencen el ${formatoFecha(m.proximoVencimiento.fecha)}`
                        : "Sin vencimientos próximos"}
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          </>
        )}
      </EstadoCarga>
      <Tarjeta
        titulo="Movimientos recientes"
        accion={
          <Link
            href="/historial"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver historial completo
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

"use client";

import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getMovimientos,
  type Marca,
  type MovimientoVista,
  type TipoMovimiento,
} from "@/lib/api/puntos";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { NOMBRE_TIPO } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { ListaMovimientos } from "./lista-movimientos";

const POR_PAGINA = 20;
const SELECT =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-48";

/** UI-14 Historial (C01, SRC-03 pp. 5–6): filtros por marca y tipo, paginación del BE. */
export function Historial() {
  const sesion = useSesion();
  const me = usePerfil();
  const [marca, setMarca] = useState<Marca | "">("");
  const [tipo, setTipo] = useState<TipoMovimiento | "">("");
  const [extra, setExtra] = useState<{
    items: MovimientoVista[];
    siguiente: string | null;
  } | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState<string | null>(null);

  const filtros = {
    marca: marca || undefined,
    tipo: tipo || undefined,
    limite: POR_PAGINA,
  };
  const primera = useCarga(
    () => getMovimientos(sesion.api(), filtros),
    [me.uid, marca, tipo],
  );

  const cambiarFiltro = (aplicar: () => void) => {
    setExtra(null);
    setErrorMas(null);
    aplicar();
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Historial"
        descripcion="Todos tus movimientos de puntos, del más reciente al más antiguo."
      />
      <Tarjeta>
        <div
          role="group"
          aria-label="Filtros"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-marca">Marca</Label>
            <select
              id="filtro-marca"
              className={SELECT}
              value={marca}
              onChange={(e) =>
                cambiarFiltro(() => setMarca(e.target.value as Marca | ""))
              }
            >
              <option value="">Todas</option>
              {me.marcas.map((m) => (
                <option key={m} value={m}>
                  {NOMBRE_MARCA[m]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filtro-tipo">Tipo</Label>
            <select
              id="filtro-tipo"
              className={SELECT}
              value={tipo}
              onChange={(e) =>
                cambiarFiltro(() =>
                  setTipo(e.target.value as TipoMovimiento | ""),
                )
              }
            >
              <option value="">Todos</option>
              {(Object.keys(NOMBRE_TIPO) as TipoMovimiento[]).map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <EstadoCarga
          carga={primera.carga}
          recargar={primera.recargar}
          etiqueta="tu historial"
        >
          {(p) => {
            const items = [...p.items, ...(extra?.items ?? [])];
            const siguiente = extra ? extra.siguiente : p.siguiente;
            return (
              <div className="flex flex-col gap-4">
                <ListaMovimientos items={items} />
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
                          ...filtros,
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

import {
  CalendarClock,
  Gift,
  Hourglass,
  PlusCircle,
  Wrench,
} from "lucide-react";
import type { MovimientoVista, TipoMovimiento } from "@/lib/api/puntos";
import {
  descripcionMovimiento,
  formatoFecha,
  formatoPuntosConSigno,
  NOMBRE_TIPO,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { cn } from "@/lib/utils";

const ICONO: Record<TipoMovimiento, typeof PlusCircle> = {
  otorgamiento: PlusCircle,
  ajuste: Wrench,
  vencimiento: Hourglass,
  canje: Gift,
};

/**
 * Movimientos del propietario (UI-03/13/14). Tabla en escritorio y tarjetas
 * en móvil (SRC-03 pp. 5–6, 9), sin scroll horizontal de página.
 */
export function ListaMovimientos({ items }: { items: MovimientoVista[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Todavía no hay movimientos para mostrar.
      </p>
    );
  }
  return (
    <>
      <table className="hidden w-full text-sm lg:table">
        <caption className="sr-only">Movimientos de puntos</caption>
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Fecha
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Tipo
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Detalle
            </th>
            <th scope="col" className="py-2 pr-3 font-semibold">
              Marca
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              Puntos
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => {
            const Icono = ICONO[m.tipo];
            return (
              <tr key={m.id} className="border-b last:border-0">
                <td className="py-3 pr-3 whitespace-nowrap">
                  {formatoFecha(m.fecha)}
                </td>
                <td className="py-3 pr-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                    <Icono aria-hidden="true" className="size-3.5" />
                    {NOMBRE_TIPO[m.tipo]}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  {descripcionMovimiento(m)}
                  {m.venceEn && (
                    <span className="block text-xs text-muted-foreground">
                      Vence el {formatoFecha(m.venceEn)}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3">{NOMBRE_MARCA[m.marca]}</td>
                <td
                  className={cn(
                    "py-3 text-right font-bold whitespace-nowrap",
                    m.puntos >= 0 ? "text-exito" : "text-destructive",
                  )}
                >
                  {formatoPuntosConSigno(m.puntos)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul
        aria-label="Movimientos de puntos"
        className="flex flex-col gap-2 lg:hidden"
      >
        {items.map((m) => {
          const Icono = ICONO[m.tipo];
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-acento">
                <Icono aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {descripcionMovimiento(m)}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock aria-hidden="true" className="size-3" />
                  {formatoFecha(m.fecha)} · {NOMBRE_MARCA[m.marca]}
                </p>
              </div>
              <span
                className={cn(
                  "text-sm font-bold whitespace-nowrap",
                  m.puntos >= 0 ? "text-exito" : "text-destructive",
                )}
              >
                {formatoPuntosConSigno(m.puntos)}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}

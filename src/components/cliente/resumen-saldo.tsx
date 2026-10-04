import { ArrowRight, Hourglass, Star } from "lucide-react";
import Link from "next/link";
import type { Saldo } from "@/lib/api/puntos";
import { formatoFecha, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";

/**
 * Saldo total informativo, saldo por marca y próximo vencimiento (C07/C08,
 * SRC-03 pp. 4–5). Todas las cifras vienen de /me/saldo; la fecha oficial de
 * vencimiento la calcula el backend (DEC-06).
 */
const VER_DETALLES =
  "inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline";

/** `conDetalles`: en Inicio, cada tarjeta enlaza a la consulta por marca (SRC-06 p. 5). */
export function ResumenSaldo({
  saldo,
  conDetalles = false,
}: {
  saldo: Saldo;
  conDetalles?: boolean;
}) {
  const proximo = saldo.marcas
    .filter((m) => m.proximoVencimiento)
    .map((m) => ({ marca: m.marca, ...m.proximoVencimiento! }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section
        aria-labelledby="titulo-saldo"
        className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:flex-row sm:items-center sm:p-6"
      >
        <div className="flex items-start gap-3 sm:min-w-48">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <Star aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2
              id="titulo-saldo"
              className="text-sm font-semibold text-muted-foreground"
            >
              Mis puntos totales
            </h2>
            <p
              className="text-3xl font-extrabold tracking-tight"
              data-testid="saldo-total"
            >
              {formatoPuntos(saldo.total)}
            </p>
            <p className="text-sm text-muted-foreground">puntos disponibles</p>
            {conDetalles && (
              <Link
                href="/puntos"
                className={VER_DETALLES}
                aria-label="Ver detalles de mis puntos por marca"
              >
                Ver detalles{" "}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
        </div>
        {saldo.marcas.length > 0 ? (
          <ul
            aria-label="Saldo por marca"
            className="grid flex-1 grid-cols-3 gap-2"
          >
            {saldo.marcas.map((m) => (
              <li
                key={m.marca}
                className="flex flex-col items-center rounded-xl bg-muted px-2 py-3 text-center"
              >
                <span className="text-xs font-bold tracking-wide uppercase">
                  {NOMBRE_MARCA[m.marca]}
                </span>
                <span className="text-lg font-extrabold">
                  {formatoPuntos(m.disponible)}
                </span>
                <span className="text-xs text-muted-foreground">puntos</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground">
            Aún no tienes marcas vinculadas para acumular puntos.
          </p>
        )}
      </section>

      <section
        aria-labelledby="titulo-vencer"
        className="flex items-start gap-3 rounded-2xl bg-aviso-suave p-5 sm:p-6"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-aviso">
          <Hourglass aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id="titulo-vencer" className="text-sm font-semibold">
            Puntos por vencer
          </h2>
          {proximo ? (
            <>
              <p className="text-2xl font-extrabold text-aviso">
                {formatoPuntos(proximo.puntos)}
              </p>
              <p className="text-sm text-muted-foreground">
                {proximo.puntos === 1 ? "punto" : "puntos"} de{" "}
                {NOMBRE_MARCA[proximo.marca]}{" "}
                {proximo.puntos === 1 ? "vence" : "vencen"} el{" "}
                {formatoFecha(proximo.fecha)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tienes puntos próximos a vencer.
            </p>
          )}
          {conDetalles && proximo && (
            <Link
              href="/puntos"
              className={VER_DETALLES}
              aria-label="Ver detalles de los puntos por vencer"
            >
              Ver detalles <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

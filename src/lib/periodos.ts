import { ZONA } from "./formato";

/**
 * Periodos de reporte (DEC-09) como fechas locales de Bolivia AAAA-MM-DD.
 * El navegador sólo propone rangos; el backend los valida y calcula.
 */
export const PRESETS = [
  { id: "hoy", texto: "Hoy" },
  { id: "7d", texto: "Últimos 7 días" },
  { id: "30d", texto: "Últimos 30 días" },
  { id: "6m", texto: "Últimos 6 meses" },
  { id: "personalizado", texto: "Personalizado" },
] as const;
export type Preset = (typeof PRESETS)[number]["id"];

const DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Bolivia. */
export const hoyBolivia = (ahora = new Date()) => DIA.format(ahora);

const aUtc = (fecha: string) => {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
};
const aTexto = (d: Date) => d.toISOString().slice(0, 10);

export const sumarDias = (fecha: string, dias: number) => {
  const d = aUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return aTexto(d);
};

export function sumarMeses(fecha: string, meses: number) {
  const d = aUtc(fecha);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimo = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimo));
  return aTexto(d);
}

/** Rango de un preset terminando hoy (incluido). */
export function rangoDe(
  preset: Exclude<Preset, "personalizado">,
  ahora = new Date(),
) {
  const hasta = hoyBolivia(ahora);
  const desde =
    preset === "hoy"
      ? hasta
      : preset === "7d"
        ? sumarDias(hasta, -6)
        : preset === "30d"
          ? sumarDias(hasta, -29)
          : sumarDias(sumarMeses(hasta, -6), 1);
  return { desde, hasta };
}

const CORTA = new Intl.DateTimeFormat("es-BO", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const MES = new Intl.DateTimeFormat("es-BO", {
  timeZone: "UTC",
  month: "short",
  year: "2-digit",
});

/** Etiqueta del inicio de una cubeta (día/semana o mes). */
export const etiquetaCubeta = (
  fecha: string,
  granularidad: "dia" | "semana" | "mes",
) => (granularidad === "mes" ? MES : CORTA).format(aUtc(fecha));

/** «3 sep 2026 – 2 oct 2026» para encabezados. */
export function textoRango(desde: string, hasta: string) {
  const largo = new Intl.DateTimeFormat("es-BO", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return desde === hasta
    ? largo.format(aUtc(desde))
    : `${largo.format(aUtc(desde))} – ${largo.format(aUtc(hasta))}`;
}

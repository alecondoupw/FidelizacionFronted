import type { Categoria, Disponibilidad, EstadoCanje } from "@/lib/api/canjes";
import type { Evento, TipoMovimiento, Unidad } from "@/lib/api/puntos";

/** Zona oficial (DEC-06): el BE calcula; el FE sólo presenta en hora de Bolivia. */
export const ZONA = "America/La_Paz";

const NUMERO = new Intl.NumberFormat("es-BO");
const FECHA = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: ZONA,
});
const FECHA_HORA = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ZONA,
});
const FECHA_LARGA = new Intl.DateTimeFormat("es-BO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: ZONA,
});

export const formatoPuntos = (n: number) => NUMERO.format(n);
export const formatoPuntosConSigno = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${NUMERO.format(Math.abs(n))}`;
export const formatoFecha = (iso: string) => FECHA.format(new Date(iso));
export const formatoFechaHora = (iso: string) =>
  FECHA_HORA.format(new Date(iso));
export const formatoFechaLarga = (d: Date) => FECHA_LARGA.format(d);

/** «1 punto» / «2 puntos» (SRC-02 p. 5, punto 13). */
export const puntosTexto = (n: number) =>
  `${formatoPuntos(n)} ${Math.abs(n) === 1 ? "punto" : "puntos"}`;

export const NOMBRE_EVENTO: Record<Evento, string> = {
  compra: "Compra",
  referido: "Referido",
  mantenimiento: "Mantenimiento",
  asistencia: "Asistencia a eventos",
};

const SUJETO_EVENTO: Record<Evento, string> = {
  compra: "Cada compra registrada",
  referido: "Cada referido registrado",
  mantenimiento: "Cada mantenimiento registrado",
  asistencia: "Cada asistencia a eventos registrada",
};

/** Resumen dinámico de una regla antes de guardarla (SRC-02 p. 5, punto 13). */
export function resumenRegla(
  evento: Evento,
  nombreMarca: string,
  puntos: number,
): string {
  return `${SUJETO_EVENTO[evento]} otorga ${puntosTexto(puntos)} para ${nombreMarca}.`;
}

export const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  otorgamiento: "Acumulación",
  ajuste: "Ajuste",
  vencimiento: "Vencimiento",
  canje: "Canje",
};

export const NOMBRE_UNIDAD: Record<Unidad, { uno: string; varios: string }> = {
  dias: { uno: "día", varios: "días" },
  meses: { uno: "mes", varios: "meses" },
  anios: { uno: "año", varios: "años" },
};

export const periodoTexto = (cantidad: number, unidad: Unidad) =>
  `${cantidad} ${cantidad === 1 ? NOMBRE_UNIDAD[unidad].uno : NOMBRE_UNIDAD[unidad].varios}`;

/** Descripción legible de un movimiento para el historial del cliente. */
export function descripcionMovimiento(m: {
  tipo: TipoMovimiento;
  evento: Evento | null;
  motivo: string | null;
}) {
  if (m.tipo === "otorgamiento" && m.evento) return NOMBRE_EVENTO[m.evento];
  return m.motivo ?? NOMBRE_TIPO[m.tipo];
}

export const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  accesorios: "Accesorios",
  ropa: "Ropa",
  servicios: "Servicios",
  experiencias: "Experiencias",
  descuentos: "Descuentos",
};

/** Estados de disponibilidad de SRC-03 p. 6; siempre los decide el backend. */
export const NOMBRE_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  disponible: "Disponible",
  ultimas: "Últimas unidades",
  agotado: "Agotado",
  proximamente: "Próximamente",
};

/** Ciclo del canje de DEC-07. */
export const NOMBRE_ESTADO_CANJE: Record<EstadoCanje, string> = {
  emitido: "Emitido",
  entregado: "Entregado",
  vencido: "Vencido",
  anulado: "Anulado",
};

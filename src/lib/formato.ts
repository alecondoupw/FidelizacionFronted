import type { Categoria, Disponibilidad, EstadoCanje } from "@/lib/api/canjes";
import type { Evento, TipoMovimiento } from "@/lib/api/puntos";

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

const DIA_LOCAL = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });

/** Fecha de hoy (AAAA-MM-DD) en hora de Bolivia, para límites de formularios. */
export const hoyEnBolivia = (ahora = new Date()) => DIA_LOCAL.format(ahora);

/** Suma años a una fecha AAAA-MM-DD; el backend valida el límite exacto. */
export function sumarAnios(fecha: string, anios: number) {
  const [a, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const dia = m === 2 && d === 29 ? 28 : d;
  return `${a + anios}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** «31 dic 2026» a partir de AAAA-MM-DD, sin desfase por zona horaria. */
export const formatoDia = (fecha: string) =>
  FECHA.format(new Date(`${fecha}T16:00:00Z`));

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

/** Acciones de auditoría (F2–F4) en lenguaje de la interfaz. */
export const NOMBRE_ACCION: Record<string, string> = {
  "cliente.registrado": "Registro de la cuenta",
  "cliente.actualizado": "Datos actualizados por un administrador",
  "cliente.eliminado": "Cuenta eliminada",
  "perfil.actualizado": "Nombre actualizado por la persona",
  "administrador.bootstrap": "Administrador inicial",
  "administrador.creado": "Administrador creado",
  "administrador.actualizado": "Administrador actualizado",
  "administrador.eliminado": "Administrador eliminado",
  "puntos.ajuste": "Ajuste de puntos",
  "puntos.asignados": "Puntos sumados por un administrador",
  "canje.entregado": "Canje entregado",
  "canje.anulado": "Canje anulado",
};

const CAMPO: Record<string, string> = {
  nombre: "nombre",
  correo: "correo",
  activo: "estado",
};

/** Resumen sin datos personales de un evento de auditoría. */
export function detalleAccion(datos: Record<string, unknown>): string {
  const partes: string[] = [];
  if (Array.isArray(datos.campos) && datos.campos.length) {
    partes.push(
      `Cambió: ${(datos.campos as string[]).map((c) => CAMPO[c] ?? c).join(", ")}`,
    );
  }
  const vinculo = datos.vinculo as
    { antes: string; despues: string } | string | undefined;
  if (
    vinculo &&
    typeof vinculo === "object" &&
    vinculo.antes !== vinculo.despues
  ) {
    partes.push(
      `vínculo: ${vinculo.despues === "vinculado" ? "vinculado" : "sin vínculo"}`,
    );
  }
  const marcas = datos.marcas as { despues?: string[] } | undefined;
  if (marcas && !Array.isArray(marcas) && marcas.despues) {
    partes.push(
      `marcas: ${marcas.despues.length ? marcas.despues.join(", ") : "ninguna"}`,
    );
  }
  // Vínculo agregado por una importación (F8, SRC-06 p. 1).
  if (
    datos.origen === "importacion" &&
    typeof datos.marcaAgregada === "string"
  ) {
    partes.push(`marca vinculada por importación: ${datos.marcaAgregada}`);
  }
  // Asignación de puntos (DEC-18): cantidad, motivo y vencimiento.
  if (typeof datos.puntos === "number" && typeof datos.venceEn === "string") {
    partes.push(
      `${puntosTexto(datos.puntos)} en ${String(datos.marca)}, vencen el ${formatoFecha(datos.venceEn)}${datos.motivo ? ` · ${String(datos.motivo)}` : ""}`,
    );
  }
  return partes.join(" · ");
}

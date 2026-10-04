import { z } from "zod";
import type { ApiClient } from "./client";
import { marcaSchema } from "./contract";

/** Contrato de puntos F2 (I-03/I-04), espejo de FidelizacionBackend. */
export const eventoSchema = z.enum([
  "compra",
  "referido",
  "mantenimiento",
  "asistencia",
]);
export const tipoMovimientoSchema = z.enum([
  "otorgamiento",
  "ajuste",
  "vencimiento",
  "canje",
]);

export type Evento = z.infer<typeof eventoSchema>;
export type TipoMovimiento = z.infer<typeof tipoMovimientoSchema>;

export const saldoSchema = z.object({
  total: z.number().int(),
  marcas: z.array(
    z.object({
      marca: marcaSchema,
      disponible: z.number().int().nonnegative(),
      proximoVencimiento: z
        .object({ fecha: z.iso.datetime(), puntos: z.number().int() })
        .nullable(),
    }),
  ),
});
export type Saldo = z.infer<typeof saldoSchema>;

export const movimientoSchema = z.object({
  id: z.string(),
  marca: marcaSchema,
  tipo: tipoMovimientoSchema,
  puntos: z.number().int(),
  fecha: z.iso.datetime(),
  venceEn: z.iso.datetime().nullable(),
  evento: eventoSchema.nullable(),
  motivo: z.string().nullable(),
});
export type MovimientoVista = z.infer<typeof movimientoSchema>;

export const paginaMovimientosSchema = z.object({
  items: z.array(movimientoSchema),
  siguiente: z.string().nullable(),
});

export const reglaSchema = z.object({
  id: z.string(),
  marca: marcaSchema,
  evento: eventoSchema,
  puntos: z.number().int().positive(),
  activa: z.boolean(),
  creadoEn: z.iso.datetime(),
  actualizadoEn: z.iso.datetime(),
  actualizadoPor: z.string(),
});
export type Regla = z.infer<typeof reglaSchema>;

/** Resultado de sumar puntos desde el panel (DEC-18). */
export const resultadoAsignacionSchema = z.object({
  movimientoId: z.string(),
  puntos: z.number().int(),
  venceEn: z.iso.datetime(),
  disponible: z.number().int(),
  repetido: z.boolean(),
});
export type ResultadoAsignacion = z.infer<typeof resultadoAsignacionSchema>;

/** Regla activa de una marca vinculada, para «¿Cómo ganar puntos?». */
export const reglaClienteSchema = z.object({
  marca: marcaSchema,
  evento: eventoSchema,
  puntos: z.number().int(),
});
export type ReglaCliente = z.infer<typeof reglaClienteSchema>;

export type Marca = z.infer<typeof marcaSchema>;

// ── Cliente ───────────────────────────────────────────────────────────
export const getSaldo = (c: ApiClient) =>
  c.request("/me/saldo", { schema: saldoSchema });

export function getMovimientos(
  c: ApiClient,
  q: {
    marca?: Marca;
    tipo?: TipoMovimiento;
    limite?: number;
    cursor?: string;
  } = {},
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined) params.set(k, String(v));
  const qs = params.size ? `?${params}` : "";
  return c.request(`/me/movimientos${qs}`, { schema: paginaMovimientosSchema });
}

export const getReglasCliente = (c: ApiClient) =>
  c.request("/reglas", {
    schema: z.object({ items: z.array(reglaClienteSchema) }),
  });

// ── Administración ────────────────────────────────────────────────────
export const getReglas = (c: ApiClient) =>
  c.request("/admin/reglas", {
    schema: z.object({ items: z.array(reglaSchema) }),
  });

export const crearRegla = (
  c: ApiClient,
  body: { marca: Marca; evento: Evento; puntos: number; activa: boolean },
) => c.request("/admin/reglas", { method: "POST", body, schema: reglaSchema });

export const actualizarRegla = (
  c: ApiClient,
  id: string,
  body: { marca?: Marca; puntos?: number; activa?: boolean },
) =>
  c.request(`/admin/reglas/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body,
    schema: reglaSchema,
  });

export const eliminarRegla = (c: ApiClient, id: string) =>
  c.request(`/admin/reglas/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: z.undefined(),
  });

/** Suma puntos con motivo y fecha de vencimiento AAAA-MM-DD (SRC-06 p. 3). */
export const asignarPuntos = (
  c: ApiClient,
  body: {
    idSolicitud: string;
    marca: Marca;
    correoCliente: string;
    puntos: number;
    motivo: string;
    vence: string;
  },
) =>
  c.request("/admin/asignaciones", {
    method: "POST",
    body,
    schema: resultadoAsignacionSchema,
  });

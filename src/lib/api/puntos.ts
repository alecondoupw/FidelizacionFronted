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
export const unidadSchema = z.enum(["dias", "meses", "anios"]);
export const tipoMovimientoSchema = z.enum([
  "otorgamiento",
  "ajuste",
  "vencimiento",
  "canje",
]);

export type Evento = z.infer<typeof eventoSchema>;
export type Unidad = z.infer<typeof unidadSchema>;
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

export const vigenciaSchema = z.object({
  marca: marcaSchema,
  activa: z.boolean(),
  cantidad: z.number().int().positive(),
  unidad: unidadSchema,
  actualizadoEn: z.iso.datetime().nullable(),
  actualizadoPor: z.string().nullable(),
});
export type Vigencia = z.infer<typeof vigenciaSchema>;

const valorVigencia = z.object({
  activa: z.boolean(),
  cantidad: z.number(),
  unidad: unidadSchema,
});
export const historialVigenciaSchema = z.object({
  items: z.array(
    z.object({
      en: z.iso.datetime(),
      actor: z.string(),
      antes: valorVigencia,
      despues: valorVigencia,
    }),
  ),
});
export type CambioVigencia = z.infer<
  typeof historialVigenciaSchema
>["items"][number];

export const resultadoEventoSchema = z.discriminatedUnion("resultado", [
  z.object({
    resultado: z.literal("otorgado"),
    puntos: z.number().int(),
    movimientoId: z.string(),
    venceEn: z.iso.datetime().nullable(),
    repetido: z.boolean(),
  }),
  z.object({
    resultado: z.literal("sin_puntos"),
    puntos: z.literal(0),
    motivo: z.enum(["sin_regla", "regla_inactiva"]),
    repetido: z.boolean(),
  }),
]);
export type ResultadoEvento = z.infer<typeof resultadoEventoSchema>;

export const resultadoAjusteSchema = z.object({
  movimientoId: z.string(),
  puntos: z.number().int(),
  disponible: z.number().int(),
  repetido: z.boolean(),
});

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

export const getVigencias = (c: ApiClient) =>
  c.request("/admin/vigencias", {
    schema: z.object({ items: z.array(vigenciaSchema) }),
  });

export const guardarVigencia = (
  c: ApiClient,
  marca: Marca,
  body: { activa: boolean; cantidad: number; unidad: Unidad },
) =>
  c.request(`/admin/vigencias/${marca}`, {
    method: "PUT",
    body,
    schema: vigenciaSchema,
  });

export const getHistorialVigencia = (c: ApiClient, marca: Marca) =>
  c.request(`/admin/vigencias/${marca}/historial`, {
    schema: historialVigenciaSchema,
  });

export const registrarEvento = (
  c: ApiClient,
  body: {
    idExterno: string;
    evento: Evento;
    marca: Marca;
    correoCliente: string;
  },
) =>
  c.request("/admin/eventos", {
    method: "POST",
    body,
    schema: resultadoEventoSchema,
  });

export const ajustarPuntos = (
  c: ApiClient,
  body: {
    idExterno: string;
    marca: Marca;
    correoCliente: string;
    puntos: number;
    motivo: string;
  },
) =>
  c.request("/admin/ajustes", {
    method: "POST",
    body,
    schema: resultadoAjusteSchema,
  });

export const procesarVencimientos = (c: ApiClient) =>
  c.request("/admin/vencimientos/procesar", {
    method: "POST",
    schema: z.object({ lotesVencidos: z.number(), cuentas: z.number() }),
  });

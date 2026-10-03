import { z } from "zod";
import { estadoCanjeSchema } from "./canjes";
import type { ApiClient } from "./client";
import { marcaSchema } from "./contract";
import { eventoSchema } from "./puntos";

/** Contrato de F5 (I-07, DEC-09), espejo de FidelizacionBackend. */
const variacionSchema = z.object({
  absoluta: z.number(),
  porcentaje: z.number().nullable(),
});
export type Variacion = z.infer<typeof variacionSchema>;
const periodoSchema = z.object({ desde: z.string(), hasta: z.string() });
const personaSchema = z.object({
  nombre: z.string().nullable(),
  correo: z.string().nullable(),
});
export const tipoMovimientoSchema = z.enum([
  "otorgamiento",
  "ajuste",
  "canje",
  "vencimiento",
]);
export type TipoMovimiento = z.infer<typeof tipoMovimientoSchema>;
type Marca = z.infer<typeof marcaSchema>;

export const resumenSchema = z.object({
  periodo: periodoSchema,
  clientes: z.object({
    total: z.number(),
    vinculados: z.number(),
    sinVincular: z.number(),
    nuevos: z.object({ valor: z.number(), variacion: variacionSchema }),
    porMarca: z.array(z.object({ marca: marcaSchema, clientes: z.number() })),
  }),
  puntosOtorgados: z.object({ valor: z.number(), variacion: variacionSchema }),
  puntosUtilizados: z.object({
    valor: z.number(),
    variacion: variacionSchema,
    vencidos: z.number(),
  }),
  canjes: z.object({
    valor: z.number(),
    variacion: variacionSchema,
    pendientesDeEntrega: z.number(),
  }),
  actividadMensual: z.array(
    z.object({
      desde: z.string(),
      otorgados: z.number(),
      utilizados: z.number(),
    }),
  ),
  canjesMensualesPorMarca: z.array(
    z.object({
      desde: z.string(),
      zontes: z.number(),
      kiden: z.number(),
      niu: z.number(),
    }),
  ),
  ultimosRegistros: z.array(
    z.object({
      uid: z.string(),
      nombre: z.string().nullable(),
      marcas: z.array(marcaSchema),
      vinculo: z.string(),
      creadoEn: z.string(),
    }),
  ),
  ultimosCanjes: z.array(
    z.object({
      codigo: z.string(),
      beneficioNombre: z.string(),
      cliente: z.string().nullable(),
      marca: marcaSchema,
      puntos: z.number(),
      estado: estadoCanjeSchema,
    }),
  ),
});
export type Resumen = z.infer<typeof resumenSchema>;

export const actividadSchema = z.object({
  periodo: periodoSchema,
  marca: marcaSchema.nullable(),
  usuariosConActividad: z.number(),
  nuevosRegistros: z.number(),
  puntosGenerados: z.number(),
  puntosUtilizados: z.number(),
  puntosVencidos: z.number(),
  ajustes: z.object({ positivos: z.number(), negativos: z.number() }),
  canjes: z.number(),
  canjesAnulados: z.number(),
  actividadesRegistradas: z.number(),
  porEvento: z.array(
    z.object({
      evento: eventoSchema,
      movimientos: z.number(),
      puntos: z.number(),
      clientes: z.number(),
    }),
  ),
});
export type Actividad = z.infer<typeof actividadSchema>;

export const METRICAS = [
  "otorgados",
  "utilizados",
  "canjes",
  "registros",
] as const;
export type Metrica = (typeof METRICAS)[number];
const serieSchema = z.object({
  desde: z.string(),
  hasta: z.string(),
  total: z.number(),
  serie: z.array(z.object({ desde: z.string(), valor: z.number() })),
});
export const tendenciasSchema = z.object({
  metrica: z.enum(METRICAS),
  marca: marcaSchema.nullable(),
  granularidad: z.enum(["dia", "semana", "mes"]),
  actual: serieSchema,
  anterior: serieSchema,
  variacion: variacionSchema,
  porMarca: z.array(z.object({ marca: marcaSchema, total: z.number() })),
});
export type Tendencias = z.infer<typeof tendenciasSchema>;

export const reporteCanjesSchema = z.object({
  periodo: periodoSchema,
  total: z.number(),
  validos: z.number(),
  anulados: z.number(),
  puntosUtilizados: z.number(),
  clientesConCanjes: z.number(),
  beneficiosMasCanjeados: z.array(
    z.object({
      beneficioId: z.string(),
      nombre: z.string(),
      canjes: z.number(),
    }),
  ),
  porMarca: z.array(
    z.object({ marca: marcaSchema, canjes: z.number(), puntos: z.number() }),
  ),
  items: z.array(
    z.object({
      codigo: z.string(),
      cliente: personaSchema,
      beneficioNombre: z.string(),
      marca: marcaSchema,
      puntos: z.number(),
      estado: estadoCanjeSchema,
      emitidoEn: z.string(),
    }),
  ),
  siguiente: z.string().nullable(),
});
export type ReporteCanjes = z.infer<typeof reporteCanjesSchema>;

export const movimientoGlobalSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  cliente: personaSchema,
  marca: marcaSchema,
  tipo: tipoMovimientoSchema,
  evento: eventoSchema.nullable(),
  puntos: z.number(),
  motivo: z.string().nullable(),
});
export type MovimientoGlobal = z.infer<typeof movimientoGlobalSchema>;

export interface Rango {
  desde: string;
  hasta: string;
}
type Consulta = Record<string, string | number | boolean | undefined>;
const qs = (q: Consulta) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "") p.set(k, String(v));
  return p.size ? `?${p}` : "";
};

export const getResumen = (c: ApiClient) =>
  c.request("/admin/reportes/resumen", { schema: resumenSchema });

export const getActividad = (c: ApiClient, q: Rango & { marca?: Marca }) =>
  c.request(`/admin/reportes/actividad${qs({ ...q })}`, {
    schema: actividadSchema,
  });

export const getTendencias = (
  c: ApiClient,
  q: Rango & { marca?: Marca; metrica: Metrica },
) =>
  c.request(`/admin/reportes/tendencias${qs({ ...q })}`, {
    schema: tendenciasSchema,
  });

export const getReporteCanjes = (
  c: ApiClient,
  q: Rango & {
    marca?: Marca;
    estado?: z.infer<typeof estadoCanjeSchema>;
    correo?: string;
    limite?: number;
    cursor?: string;
  },
) =>
  c.request(`/admin/reportes/canjes${qs({ ...q })}`, {
    schema: reporteCanjesSchema,
  });

export const getMovimientos = (
  c: ApiClient,
  q: Rango & {
    marca?: Marca;
    tipo?: TipoMovimiento;
    evento?: z.infer<typeof eventoSchema>;
    limite?: number;
    cursor?: string;
  },
) =>
  c.request(`/admin/movimientos${qs({ ...q })}`, {
    schema: z.object({
      items: z.array(movimientoGlobalSchema),
      siguiente: z.string().nullable(),
    }),
  });

// ── Exportaciones (A12) ───────────────────────────────────────────────
export const TIPOS_EXPORTACION = [
  "clientes",
  "movimientos",
  "canjes",
  "actividad",
] as const;
export type TipoExportacion = (typeof TIPOS_EXPORTACION)[number];
export type Formato = "csv" | "xlsx";
export type FiltrosExportacion = Partial<Rango> & {
  marca?: Marca;
  activo?: boolean;
  vinculo?: "vinculado" | "no_vinculado";
  tipo?: TipoMovimiento;
  evento?: z.infer<typeof eventoSchema>;
  estado?: z.infer<typeof estadoCanjeSchema>;
};

export const getVistaPrevia = (
  c: ApiClient,
  tipo: TipoExportacion,
  f: FiltrosExportacion,
) =>
  c.request(`/admin/exportaciones/${tipo}/vista-previa${qs({ ...f })}`, {
    schema: z.object({
      filas: z.number(),
      columnas: z.array(z.string()),
      maximo: z.number(),
    }),
  });

export const descargarExportacion = (
  c: ApiClient,
  tipo: TipoExportacion,
  f: FiltrosExportacion,
  formato: Formato,
) =>
  c.descargar(
    `/admin/exportaciones/${tipo}${qs({ ...f, formato })}`,
    formato === "csv"
      ? "text/csv"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // Hasta 10.000 filas con nombres y correos (DEC-09).
    { timeoutMs: 60_000 },
  );

import { z } from "zod";
import type { ApiClient } from "./client";
import { marcaSchema } from "./contract";
import type { Marca } from "./puntos";

/** Importación y vinculación de clientes por marca (F8, SRC-06 pp. 1–2, DEC-17). */
export const estadoFilaSchema = z.enum([
  "nuevo",
  "nueva_asociacion",
  "ya_importado",
  "duplicado_archivo",
  "conflicto",
  "revision",
  "error",
]);
export type EstadoFila = z.infer<typeof estadoFilaSchema>;

export const vinculacionSchema = z
  .enum(["vinculara", "vinculado", "ya_vinculado", "pendiente"])
  .nullable();

export const filaImportacionSchema = z.object({
  fila: z.number().int(),
  nombre: z.string(),
  correo: z.string(),
  estado: estadoFilaSchema,
  vinculacion: vinculacionSchema,
  asociacionesPrevias: z.array(marcaSchema),
  motivo: z.string().nullable(),
});
export type FilaImportacion = z.infer<typeof filaImportacionSchema>;

export const resumenImportacionSchema = z.object({
  filas: z.number().int(),
  importados: z.number().int(),
  vinculados: z.number().int(),
  pendientes: z.number().int(),
  duplicados: z.number().int(),
  conflictos: z.number().int(),
  revision: z.number().int(),
  errores: z.number().int(),
});
export type ResumenImportacion = z.infer<typeof resumenImportacionSchema>;

export const vistaPreviaSchema = z.object({
  marca: marcaSchema,
  resumen: resumenImportacionSchema,
  filas: z.array(filaImportacionSchema),
});
export type VistaPreviaImportacion = z.infer<typeof vistaPreviaSchema>;

export const resultadoImportacionSchema = z.object({
  id: z.string(),
  resumen: resumenImportacionSchema,
  repetido: z.boolean(),
});

export const importacionSchema = z.object({
  id: z.string(),
  marca: marcaSchema,
  archivo: z.string(),
  creadoEn: z.iso.datetime(),
  expiraEn: z.iso.datetime(),
  estado: z.enum(["en_proceso", "completada"]),
  resumen: resumenImportacionSchema.nullable(),
});
export type Importacion = z.infer<typeof importacionSchema>;

export const pendienteSchema = z.object({
  correo: z.string(),
  marcas: z.array(
    z.object({
      marca: marcaSchema,
      nombre: z.string(),
      importadoEn: z.iso.datetime(),
    }),
  ),
  actualizadoEn: z.iso.datetime(),
});
export type Pendiente = z.infer<typeof pendienteSchema>;

/** La lectura de hasta 5.000 filas puede tardar: se espera hasta 2 minutos. */
const ESPERA_IMPORTACION_MS = 120_000;

export const vistaPreviaImportacion = (
  c: ApiClient,
  marca: Marca,
  archivo: Blob,
) =>
  c.enviarArchivo(
    `/admin/importaciones/vista-previa?${new URLSearchParams({ marca })}`,
    archivo,
    { schema: vistaPreviaSchema, timeoutMs: ESPERA_IMPORTACION_MS },
  );

export const confirmarImportacion = (
  c: ApiClient,
  q: { marca: Marca; archivo: string; idImportacion: string },
  archivo: Blob,
) =>
  c.enviarArchivo(`/admin/importaciones?${new URLSearchParams(q)}`, archivo, {
    schema: resultadoImportacionSchema,
    timeoutMs: ESPERA_IMPORTACION_MS,
  });

export const getImportaciones = (c: ApiClient) =>
  c.request("/admin/importaciones", {
    schema: z.object({ items: z.array(importacionSchema) }),
  });

export const descargarReporteImportacion = (
  c: ApiClient,
  id: string,
  formato: "csv" | "xlsx",
) =>
  c.descargar(
    `/admin/importaciones/${encodeURIComponent(id)}/reporte?formato=${formato}`,
    formato === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv",
  );

export const getPendientes = (
  c: ApiClient,
  q: { marca?: Marca; correo?: string; limite?: number; cursor?: string } = {},
) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "") p.set(k, String(v));
  return c.request(`/admin/importados${p.size ? `?${p}` : ""}`, {
    schema: z.object({
      items: z.array(pendienteSchema),
      siguiente: z.string().nullable(),
    }),
  });
};

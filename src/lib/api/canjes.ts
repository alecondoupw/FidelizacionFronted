import { z } from "zod";
import type { ApiClient } from "./client";
import { marcaSchema } from "./contract";

/** Contrato de F3 (I-05, DEC-07), espejo de FidelizacionBackend. */
export const categoriaSchema = z.enum([
  "accesorios",
  "ropa",
  "servicios",
  "experiencias",
  "descuentos",
]);
export const disponibilidadSchema = z.enum([
  "disponible",
  "ultimas",
  "agotado",
  "proximamente",
]);
export const estadoCanjeSchema = z.enum([
  "emitido",
  "entregado",
  "vencido",
  "anulado",
]);

export type Categoria = z.infer<typeof categoriaSchema>;
export type Disponibilidad = z.infer<typeof disponibilidadSchema>;
export type EstadoCanje = z.infer<typeof estadoCanjeSchema>;

export const beneficioSchema = z.object({
  id: z.string(),
  marca: marcaSchema,
  nombre: z.string(),
  descripcion: z.string(),
  categoria: categoriaSchema,
  puntos: z.number().int().positive(),
  caracteristicas: z.array(z.string()),
  disponibleDesde: z.iso.datetime().nullable(),
  vigenciaCuponDias: z.number().int(),
  disponibilidad: disponibilidadSchema,
  variantes: z.array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      disponibilidad: disponibilidadSchema,
    }),
  ),
});
export type BeneficioVista = z.infer<typeof beneficioSchema>;

export const canjeSchema = z.object({
  codigo: z.string(),
  beneficioId: z.string(),
  beneficioNombre: z.string(),
  marca: marcaSchema,
  varianteNombre: z.string(),
  puntos: z.number().int(),
  estado: estadoCanjeSchema,
  emitidoEn: z.iso.datetime(),
  venceEn: z.iso.datetime(),
  entregadoEn: z.iso.datetime().nullable(),
  anuladoEn: z.iso.datetime().nullable(),
  motivoAnulacion: z.string().nullable(),
});
export type CanjeVista = z.infer<typeof canjeSchema>;

const varianteAdmin = z.object({
  id: z.string(),
  nombre: z.string(),
  stock: z.number().int().nullable(),
});
export const beneficioAdminSchema = z.object({
  id: z.string(),
  marca: marcaSchema,
  nombre: z.string(),
  descripcion: z.string(),
  categoria: categoriaSchema,
  puntos: z.number().int(),
  activo: z.boolean(),
  disponibleDesde: z.iso.datetime().nullable(),
  vigenciaCuponDias: z.number().int(),
  caracteristicas: z.array(z.string()),
  variantes: z.array(varianteAdmin),
  actualizadoEn: z.iso.datetime(),
  actualizadoPor: z.string(),
});
export type BeneficioAdmin = z.infer<typeof beneficioAdminSchema>;
export type DatosBeneficio = Omit<
  BeneficioAdmin,
  "id" | "actualizadoEn" | "actualizadoPor"
>;

type Marca = z.infer<typeof marcaSchema>;
const qs = (q: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "") p.set(k, String(v));
  return p.size ? `?${p}` : "";
};

// ── Cliente ───────────────────────────────────────────────────────────
export const getCatalogo = (
  c: ApiClient,
  q: { marca?: Marca; categoria?: Categoria; q?: string } = {},
) =>
  c.request(`/catalogo${qs(q)}`, {
    schema: z.object({ items: z.array(beneficioSchema) }),
  });

export const getBeneficio = (c: ApiClient, id: string) =>
  c.request(`/catalogo/${encodeURIComponent(id)}`, { schema: beneficioSchema });

export const canjear = (
  c: ApiClient,
  body: { beneficioId: string; varianteId: string; idSolicitud: string },
) =>
  c.request("/canjes", {
    method: "POST",
    body,
    schema: z.object({
      canje: canjeSchema,
      disponible: z.number().int(),
      repetido: z.boolean(),
    }),
  });

export const getMisCanjes = (
  c: ApiClient,
  q: { marca?: Marca; limite?: number; cursor?: string } = {},
) =>
  c.request(`/me/canjes${qs(q)}`, {
    schema: z.object({
      items: z.array(canjeSchema),
      siguiente: z.string().nullable(),
    }),
  });

export const getMiCanje = (c: ApiClient, codigo: string) =>
  c.request(`/me/canjes/${encodeURIComponent(codigo)}`, {
    schema: canjeSchema,
  });

export const descargarComprobante = (c: ApiClient, codigo: string) =>
  c.descargar(
    `/me/canjes/${encodeURIComponent(codigo)}/comprobante`,
    "application/pdf",
  );

export const descargarQr = (c: ApiClient, codigo: string) =>
  c.descargar(
    `/me/canjes/${encodeURIComponent(codigo)}/qr.svg`,
    "image/svg+xml",
  );

// ── Administración ────────────────────────────────────────────────────
export const getBeneficiosAdmin = (c: ApiClient) =>
  c.request("/admin/beneficios", {
    schema: z.object({ items: z.array(beneficioAdminSchema) }),
  });

export const crearBeneficio = (c: ApiClient, body: DatosBeneficio) =>
  c.request("/admin/beneficios", {
    method: "POST",
    body,
    schema: beneficioAdminSchema,
  });

export const actualizarBeneficio = (
  c: ApiClient,
  id: string,
  body: DatosBeneficio,
) =>
  c.request(`/admin/beneficios/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
    schema: beneficioAdminSchema,
  });

export const getCanjeAdmin = (c: ApiClient, codigo: string) =>
  c.request(`/admin/canjes/${encodeURIComponent(codigo)}`, {
    schema: canjeSchema,
  });

export const entregarCanje = (c: ApiClient, codigo: string) =>
  c.request(`/admin/canjes/${encodeURIComponent(codigo)}/entregar`, {
    method: "POST",
    schema: canjeSchema,
  });

export const anularCanje = (c: ApiClient, codigo: string, motivo: string) =>
  c.request(`/admin/canjes/${encodeURIComponent(codigo)}/anular`, {
    method: "POST",
    body: { motivo },
    schema: z.object({ canje: canjeSchema, disponible: z.number().int() }),
  });

/** Guarda un Blob como archivo desde el navegador. */
export function guardarArchivo(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

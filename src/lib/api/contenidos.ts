import { z } from "zod";
import type { ApiClient } from "./client";
import { marcaSchema } from "./contract";

/** Contrato de F6 (I-08, DEC-10), espejo de FidelizacionBackend. */
export const categoriaContenidoSchema = z.enum([
  "noticia",
  "evento",
  "promocion",
]);
export type CategoriaContenido = z.infer<typeof categoriaContenidoSchema>;
const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const publicacionClienteSchema = z.object({
  id: z.string(),
  marca: marcaSchema,
  categoria: categoriaContenidoSchema,
  titulo: z.string(),
  texto: z.string(),
  enlace: z.string().nullable(),
  destacada: z.boolean(),
  publicarDesde: fecha,
});
export type PublicacionCliente = z.infer<typeof publicacionClienteSchema>;

export const publicacionAdminSchema = publicacionClienteSchema.extend({
  activa: z.boolean(),
  publicarHasta: fecha,
  estado: z.enum(["programada", "publicada", "finalizada"]),
  visible: z.boolean(),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
  actualizadoPor: z.string(),
});
export type PublicacionAdmin = z.infer<typeof publicacionAdminSchema>;
export type DatosPublicacion = Pick<
  PublicacionAdmin,
  | "marca"
  | "categoria"
  | "titulo"
  | "texto"
  | "enlace"
  | "destacada"
  | "activa"
  | "publicarDesde"
  | "publicarHasta"
>;
type Marca = z.infer<typeof marcaSchema>;

export const getContenidos = (
  c: ApiClient,
  q: { marca?: Marca; destacadas?: boolean; limite?: number } = {},
) => {
  const p = new URLSearchParams();
  if (q.marca) p.set("marca", q.marca);
  if (q.destacadas) p.set("destacadas", "true");
  if (q.limite) p.set("limite", String(q.limite));
  return c.request(`/contenidos${p.size ? `?${p}` : ""}`, {
    schema: z.object({ items: z.array(publicacionClienteSchema) }),
  });
};

export const getContenidosAdmin = (c: ApiClient, marca?: Marca) =>
  c.request(`/admin/contenidos${marca ? `?marca=${marca}` : ""}`, {
    schema: z.object({ items: z.array(publicacionAdminSchema) }),
  });

export const crearContenido = (c: ApiClient, body: DatosPublicacion) =>
  c.request("/admin/contenidos", {
    method: "POST",
    body,
    schema: publicacionAdminSchema,
  });

export const actualizarContenido = (
  c: ApiClient,
  id: string,
  body: DatosPublicacion,
) =>
  c.request(`/admin/contenidos/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
    schema: publicacionAdminSchema,
  });

export const activarContenido = (c: ApiClient, id: string, activa: boolean) =>
  c.request(`/admin/contenidos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { activa },
    schema: publicacionAdminSchema,
  });

export const eliminarContenido = (c: ApiClient, id: string) =>
  c.request(`/admin/contenidos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    schema: z.undefined(),
  });

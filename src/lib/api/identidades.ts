import { z } from "zod";
import type { ApiClient } from "./client";
import { marcaSchema } from "./contract";

/** Contrato de F4 (I-06, DEC-03/04/08), espejo de FidelizacionBackend. */
export const administradorSchema = z.object({
  uid: z.string(),
  nombre: z.string().nullable(),
  correo: z.string(),
  activo: z.boolean(),
  creadoEn: z.string(),
  ultimoAcceso: z.iso.datetime().nullable(),
  invitacionPendiente: z.boolean(),
});
export type Administrador = z.infer<typeof administradorSchema>;

export const clienteSchema = z.object({
  uid: z.string(),
  nombre: z.string().nullable(),
  correo: z.string(),
  marcas: z.array(marcaSchema),
  vinculo: z.enum(["vinculado", "no_vinculado"]),
  activo: z.boolean(),
  puntos: z.number().int(),
  creadoEn: z.string(),
  ultimoAcceso: z.iso.datetime().nullable(),
  verificacionPendiente: z.boolean(),
});
export type Cliente = z.infer<typeof clienteSchema>;

export const eventoHistorialSchema = z.object({
  accion: z.string(),
  actor: z.string(),
  actorNombre: z.string().nullable(),
  en: z.string(),
  datos: z.record(z.string(), z.unknown()),
});
export type EventoHistorial = z.infer<typeof eventoHistorialSchema>;

export const detalleClienteSchema = clienteSchema.extend({
  saldos: z.array(
    z.object({
      marca: marcaSchema,
      disponible: z.number().int(),
      vinculada: z.boolean(),
    }),
  ),
  historial: z.array(eventoHistorialSchema),
});
export type DetalleCliente = z.infer<typeof detalleClienteSchema>;

type Marca = z.infer<typeof marcaSchema>;
export interface FiltroClientes {
  correo?: string;
  marca?: Marca;
  activo?: boolean;
  vinculo?: "vinculado" | "no_vinculado";
  limite?: number;
  cursor?: string;
}

const qs = (q: FiltroClientes) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "") p.set(k, String(v));
  return p.size ? `?${p}` : "";
};
const ruta = (base: string, uid: string) =>
  `${base}/${encodeURIComponent(uid)}`;

// ── Perfil propio ─────────────────────────────────────────────────────
export const actualizarMiNombre = (c: ApiClient, nombre: string) =>
  c.request("/me", {
    method: "PATCH",
    body: { nombre },
    schema: z.undefined(),
  });

// ── Administradores (UI-06) ───────────────────────────────────────────
export const getAdministradores = (c: ApiClient) =>
  c.request("/admin/administradores", {
    schema: z.object({ items: z.array(administradorSchema) }),
  });

export const crearAdministrador = (
  c: ApiClient,
  body: { nombre: string; apellido: string; correo: string },
) =>
  c.request("/admin/administradores", {
    method: "POST",
    body,
    schema: administradorSchema,
  });

export const actualizarAdministrador = (
  c: ApiClient,
  uid: string,
  body: { nombre?: string; activo?: boolean },
) =>
  c.request(ruta("/admin/administradores", uid), {
    method: "PATCH",
    body,
    schema: administradorSchema,
  });

export const eliminarAdministrador = (c: ApiClient, uid: string) =>
  c.request(ruta("/admin/administradores", uid), {
    method: "DELETE",
    schema: z.undefined(),
  });

// ── Clientes (UI-07) ──────────────────────────────────────────────────
export const getClientes = (c: ApiClient, q: FiltroClientes = {}) =>
  c.request(`/admin/clientes${qs(q)}`, {
    schema: z.object({
      items: z.array(clienteSchema),
      siguiente: z.string().nullable(),
    }),
  });

export const getCliente = (c: ApiClient, uid: string) =>
  c.request(ruta("/admin/clientes", uid), { schema: detalleClienteSchema });

export const actualizarCliente = (
  c: ApiClient,
  uid: string,
  body: { nombre?: string; correo?: string; activo?: boolean },
) =>
  c.request(ruta("/admin/clientes", uid), {
    method: "PATCH",
    body,
    schema: detalleClienteSchema,
  });

export const eliminarCliente = (c: ApiClient, uid: string) =>
  c.request(ruta("/admin/clientes", uid), {
    method: "DELETE",
    schema: z.undefined(),
  });

import { z } from "zod";

/**
 * Contrato HTTP compartido con el backend Express, versión v0 (F0).
 * Fuente: Zontes-Core/02-Arquitectura/Contrato API v0 - F0.md.
 * Se duplica de forma deliberada en ambos repositorios; cualquier cambio
 * exige actualizar el contrato en el Core y las pruebas de ambos lados.
 */
export const API_PREFIX = "/api/v1";

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.unknown().optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
  time: z.iso.datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** I-01/I-02 v1, aprobados por Paulo el 2026-10-03. */
export const rolSchema = z.enum(["cliente", "administrador"]);
export const marcaSchema = z.enum(["zontes", "kiden", "niu"]);
export const vinculoSchema = z.enum(["vinculado", "no_vinculado"]);

export const meResponseSchema = z.object({
  uid: z.string().min(1),
  rol: rolSchema,
  activo: z.boolean(),
  marcas: z.array(marcaSchema),
  vinculo: vinculoSchema,
});

export const registroResponseSchema = z.object({
  vinculo: vinculoSchema,
  marcas: z.array(marcaSchema),
});

export type Marca = z.infer<typeof marcaSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type RegistroResponse = z.infer<typeof registroResponseSchema>;

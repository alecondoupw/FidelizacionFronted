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

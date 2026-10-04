import type { ApiClient } from "./client";
import {
  meResponseSchema,
  registroResponseSchema,
  type MeResponse,
  type RegistroResponse,
} from "./contract";

/**
 * Espera de la primera petición de una visita: el backend gratuito de Render
 * se suspende tras 15 min sin uso y tarda cerca de un minuto en volver (DEC-13).
 */
export const ESPERA_ARRANQUE_MS = 75_000;

/** I-01: identidad, rol, estado y marcas del usuario autenticado. */
export function getMe(
  client: ApiClient,
  opciones: { timeoutMs?: number } = {},
): Promise<MeResponse> {
  return client.request("/me", {
    schema: meResponseSchema,
    timeoutMs: opciones.timeoutMs,
  });
}

/** I-02: completa el registro y evalúa el vínculo por correo verificado. */
export function registrarCliente(client: ApiClient): Promise<RegistroResponse> {
  return client.request("/clientes/registro", {
    method: "POST",
    schema: registroResponseSchema,
  });
}

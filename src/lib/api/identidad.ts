import type { ApiClient } from "./client";
import {
  meResponseSchema,
  registroResponseSchema,
  type MeResponse,
  type RegistroResponse,
} from "./contract";

/** I-01: identidad, rol, estado y marcas del usuario autenticado. */
export function getMe(client: ApiClient): Promise<MeResponse> {
  return client.request("/me", { schema: meResponseSchema });
}

/** I-02: completa el registro y evalúa el vínculo por correo verificado. */
export function registrarCliente(client: ApiClient): Promise<RegistroResponse> {
  return client.request("/clientes/registro", {
    method: "POST",
    schema: registroResponseSchema,
  });
}

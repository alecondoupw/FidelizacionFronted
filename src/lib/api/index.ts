import { createApiClient, type ApiClientOptions } from "./client";

export { ApiError, createApiClient, type ApiClient } from "./client";
export { getHealth } from "./health";
export { getMe, registrarCliente } from "./identidad";

/**
 * Cliente por defecto para el navegador y el servidor de Next.js.
 * `NEXT_PUBLIC_API_BASE_URL` se inserta en build; debe leerse de forma
 * literal para que Next.js la sustituya (ver docs de variables de entorno).
 * `getIdToken` añade el ID token de Firebase en las rutas protegidas.
 */
export function getDefaultApiClient(
  getIdToken?: ApiClientOptions["getIdToken"],
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "Falta NEXT_PUBLIC_API_BASE_URL. Copia .env.example a .env.local y define la URL del backend.",
    );
  }
  return createApiClient({ baseUrl, getIdToken });
}

import { ApiError } from "@/lib/api/client";

/**
 * Mensajes para el usuario. No revelan si una cuenta existe (REQ-03) ni
 * detalles internos; el código técnico queda para soporte.
 */
const FIREBASE: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-disabled": "No es posible ingresar con esta cuenta.",
  "auth/too-many-requests":
    "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  "auth/network-request-failed":
    "No hay conexión. Revisa tu red e inténtalo de nuevo.",
  "auth/email-already-in-use":
    "No se pudo crear la cuenta con ese correo. Si ya tienes una, inicia sesión.",
  "auth/weak-password": "La contraseña es demasiado débil.",
};

export function mensajeError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NETWORK_ERROR":
      case "TIMEOUT":
        return "No pudimos conectar con el servidor. Inténtalo de nuevo.";
      case "AUTH_NOT_CONFIGURED":
        return "La autenticación no está disponible en este entorno.";
      default:
        return error.message || "Ocurrió un error inesperado.";
    }
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && FIREBASE[code]) return FIREBASE[code];
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

/** Avisos que una ruta protegida deja al devolver al usuario al acceso. */
export const AVISOS = {
  "sesion-expirada": "Tu sesión expiró. Vuelve a iniciar sesión.",
  "cuenta-desactivada":
    "Tu cuenta está desactivada. Si crees que es un error, contacta a soporte.",
  "sesion-cerrada": "Cerraste sesión correctamente.",
} as const;

export type Aviso = keyof typeof AVISOS;

export function leerAviso(valor: string | null): string | null {
  return valor && valor in AVISOS ? AVISOS[valor as Aviso] : null;
}

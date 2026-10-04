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

/**
 * Errores de configuración del proyecto Firebase (clave web inválida o
 * restringida, proveedor desactivado, dominio no autorizado). No dependen del
 * usuario: se indican como tales y con su código para el equipo técnico.
 */
const CONFIGURACION = [
  "auth/api-key-not-valid",
  "auth/invalid-api-key",
  "auth/operation-not-allowed",
  "auth/configuration-not-found",
  "auth/unauthorized-domain",
  "auth/app-not-authorized",
  "auth/requests-from-referer",
];

export function mensajeError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "NETWORK_ERROR":
      case "TIMEOUT":
        return "No pudimos conectar con el servidor. Inténtalo de nuevo.";
      case "AUTH_NOT_CONFIGURED":
        return "La autenticación no está disponible en este entorno.";
      default: {
        const mensaje = error.message || "Ocurrió un error inesperado.";
        // Los fallos del servidor llevan una referencia para buscarlos en los
        // registros del backend (F7, observabilidad).
        return error.status >= 500 && error.requestId
          ? `${mensaje} (referencia ${error.requestId.slice(0, 8)})`
          : mensaje;
      }
    }
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "string") {
    return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
  if (FIREBASE[code]) return FIREBASE[code];
  if (CONFIGURACION.some((prefijo) => code.startsWith(prefijo))) {
    return `El acceso no está bien configurado en este entorno. Avisa al equipo técnico (código ${code}).`;
  }
  return `Ocurrió un error inesperado. Inténtalo de nuevo (código ${code}).`;
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

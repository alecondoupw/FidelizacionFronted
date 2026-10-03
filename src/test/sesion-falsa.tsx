import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import { SesionContext, type Sesion } from "@/lib/auth/sesion";

/** Respuestas HTTP del backend por ruta (`GET /me`, `POST /clientes/registro`). */
export type Respuestas = Record<string, { status: number; body: unknown }>;

export function respuesta(status: number, body: unknown) {
  return { status, body };
}

export function errorApi(status: number, code: string, message = "Error") {
  return respuesta(status, { error: { code, message, requestId: "req-1" } });
}

/**
 * Sesión de prueba: Firebase sustituido por funciones simuladas y la API por
 * el cliente fetch real contra respuestas simuladas (valida el contrato).
 */
export function crearSesionFalsa(
  parcial: Partial<Sesion> = {},
  respuestas: Respuestas = {},
) {
  const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
    const ruta = String(input).replace("http://be/api/v1", "");
    const r = respuestas[`${init?.method ?? "GET"} ${ruta}`];
    if (!r) throw new TypeError("fetch failed");
    // 204 no admite cuerpo: `Response` lo rechazaría como fallo de red.
    if (r.status === 204) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  });
  const sesion: Sesion = {
    configurada: true,
    estado: "autenticado",
    usuario: {
      uid: "u-1",
      correo: "cliente.zontes@ejemplo.test",
      nombre: "Ana Prueba",
      correoVerificado: true,
      ultimoIngreso: "2026-10-03T12:00:00.000Z",
    },
    api: () =>
      createApiClient({
        baseUrl: "http://be",
        fetchImpl,
        getIdToken: async () => "token",
      }),
    ingresar: vi.fn(async () => {}),
    crearCuenta: vi.fn(async () => {}),
    reenviarVerificacion: vi.fn(async () => {}),
    comprobarVerificacion: vi.fn(async () => true),
    enviarCorreoContrasena: vi.fn(async () => {}),
    recargarUsuario: vi.fn(async () => {}),
    cerrarSesion: vi.fn(async () => {}),
    ...parcial,
  };
  return { sesion, fetchImpl };
}

export function renderConSesion(ui: ReactElement, sesion: Sesion) {
  return render(
    <SesionContext.Provider value={sesion}>{ui}</SesionContext.Provider>,
  );
}

export const ME_CLIENTE = {
  uid: "u-1",
  rol: "cliente",
  activo: true,
  marcas: ["zontes", "niu"],
  vinculo: "vinculado",
} as const;

export const ME_ADMIN = {
  uid: "u-2",
  rol: "administrador",
  activo: true,
  marcas: [],
  vinculo: "no_vinculado",
} as const;

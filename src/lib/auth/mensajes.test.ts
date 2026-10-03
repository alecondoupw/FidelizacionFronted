import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { leerAviso, mensajeError } from "./mensajes";

const firebase = (code: string) => Object.assign(new Error("x"), { code });

describe("mensajeError", () => {
  it("credenciales incorrectas → mensaje genérico sin código", () => {
    expect(mensajeError(firebase("auth/invalid-credential"))).toBe(
      "Correo o contraseña incorrectos.",
    );
  });

  it.each([
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.",
    "auth/invalid-api-key",
    "auth/operation-not-allowed",
    "auth/unauthorized-domain",
    "auth/requests-from-referer-http://localhost:3000-are-blocked.",
  ])("%s → error de configuración con su código", (code) => {
    const mensaje = mensajeError(firebase(code));
    expect(mensaje).toContain("no está bien configurado");
    expect(mensaje).toContain(code);
  });

  it("código desconocido → genérico con el código para soporte", () => {
    expect(mensajeError(firebase("auth/algo-nuevo"))).toBe(
      "Ocurrió un error inesperado. Inténtalo de nuevo (código auth/algo-nuevo).",
    );
  });

  it("error sin código → genérico", () => {
    expect(mensajeError(new Error("x"))).toBe(
      "Ocurrió un error inesperado. Inténtalo de nuevo.",
    );
  });

  it("ApiError de red → mensaje de conexión", () => {
    expect(
      mensajeError(
        new ApiError({ status: 0, code: "NETWORK_ERROR", message: "" }),
      ),
    ).toContain("No pudimos conectar");
  });

  it("leerAviso sólo acepta avisos conocidos", () => {
    expect(leerAviso("sesion-cerrada")).toBe("Cerraste sesión correctamente.");
    expect(leerAviso("otro")).toBeNull();
  });
});

// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
} from "@/test/sesion-falsa";
import { GuardiaRol, usePerfil } from "./guardia-rol";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => replace.mockReset());
afterEach(cleanup);

function Contenido() {
  const me = usePerfil();
  return <p>Contenido protegido de {me.uid}</p>;
}

const guardia = (rol: "cliente" | "administrador" = "cliente") => (
  <GuardiaRol rol={rol} rutaAcceso="/ingresar">
    <Contenido />
  </GuardiaRol>
);

describe("F1-FE-01/03 · GuardiaRol", () => {
  it("sin sesión → redirige al acceso y no muestra contenido", async () => {
    const { sesion } = crearSesionFalsa({ estado: "anonimo", usuario: null });
    renderConSesion(guardia(), sesion);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/ingresar"));
    expect(screen.queryByText(/Contenido protegido/)).toBeNull();
  });

  it("muestra carga accesible mientras /me no responde", () => {
    const { sesion } = crearSesionFalsa({ estado: "cargando" });
    renderConSesion(guardia(), sesion);
    expect(screen.getByText("Cargando tu cuenta…")).toBeTruthy();
    expect(screen.queryByText(/Contenido protegido/)).toBeNull();
  });

  it("rol correcto → muestra el contenido con el perfil del backend", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": respuesta(200, ME_CLIENTE) },
    );
    renderConSesion(guardia(), sesion);
    expect(await screen.findByText("Contenido protegido de u-1")).toBeTruthy();
  });

  it("rol distinto → aviso sin contenido y enlace a su zona", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": respuesta(200, ME_ADMIN) },
    );
    renderConSesion(guardia("cliente"), sesion);
    expect(
      await screen.findByText("Esta sección no está disponible para tu cuenta"),
    ).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/reglas");
    expect(screen.queryByText(/Contenido protegido/)).toBeNull();
  });

  it("401 → cierra sesión y vuelve al acceso con aviso de sesión expirada", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": errorApi(401, "UNAUTHENTICATED") },
    );
    renderConSesion(guardia(), sesion);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/ingresar?aviso=sesion-expirada"),
    );
    expect(sesion.cerrarSesion).toHaveBeenCalled();
  });

  it("registro incompleto → /registro", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "GET /me": errorApi(403, "REGISTRATION_REQUIRED"),
      },
    );
    renderConSesion(guardia(), sesion);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/registro"));
  });

  it("cuenta desactivada → cierra sesión con aviso", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": errorApi(403, "FORBIDDEN") },
    );
    renderConSesion(guardia(), sesion);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/ingresar?aviso=cuenta-desactivada",
      ),
    );
  });

  it("error de red → alerta y reintento que recupera la cuenta", async () => {
    const respuestas = {} as Record<string, { status: number; body: unknown }>;
    const { sesion } = crearSesionFalsa({}, respuestas);
    renderConSesion(guardia(), sesion);
    expect(await screen.findByText("No pudimos cargar tu cuenta")).toBeTruthy();
    respuestas["GET /me"] = respuesta(200, ME_CLIENTE);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Contenido protegido de u-1")).toBeTruthy();
  });

  it("respuesta fuera de contrato → error, nunca contenido", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "GET /me": respuesta(200, { uid: "u-1", rol: "superusuario" }),
      },
    );
    renderConSesion(guardia(), sesion);
    expect(await screen.findByText("No pudimos cargar tu cuenta")).toBeTruthy();
    expect(screen.queryByText(/Contenido protegido/)).toBeNull();
  });
});

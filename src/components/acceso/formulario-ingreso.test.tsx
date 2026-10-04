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
import { FormularioIngreso } from "./formulario-ingreso";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => replace.mockReset());
afterEach(cleanup);

async function ingresar(
  correo = "cliente.zontes@ejemplo.test",
  clave = "secreta1",
) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Correo electrónico"), correo);
  await user.type(screen.getByLabelText("Contraseña"), clave);
  await user.click(screen.getByRole("button", { name: "Ingresar" }));
}

describe("F1-FE-01 · ingreso de cliente (UI-02)", () => {
  it("cliente válido → entra a Inicio", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": respuesta(200, ME_CLIENTE) },
    );
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await ingresar();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/inicio"));
    expect(sesion.ingresar).toHaveBeenCalledWith(
      "cliente.zontes@ejemplo.test",
      "secreta1",
    );
  });

  it("al abrir el acceso despierta el backend con /health", async () => {
    const { sesion, fetchImpl } = crearSesionFalsa();
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await waitFor(() =>
      expect(String(fetchImpl.mock.calls[0]?.[0])).toBe(
        "http://be/api/v1/health",
      ),
    );
  });

  it("valida en el navegador antes de llamar a Firebase", async () => {
    const { sesion } = crearSesionFalsa();
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByText("Ingresa un correo válido.")).toBeTruthy();
    expect(screen.getByText("Ingresa tu contraseña.")).toBeTruthy();
    expect(sesion.ingresar).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Correo electrónico").getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("credenciales incorrectas → mensaje genérico que no revela si la cuenta existe", async () => {
    const { sesion } = crearSesionFalsa({
      ingresar: vi.fn(async () => {
        throw Object.assign(new Error("x"), {
          code: "auth/invalid-credential",
        });
      }),
    });
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await ingresar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Correo o contraseña incorrectos.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("cuenta de administrador en el acceso de clientes → se rechaza y se cierra la sesión", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": respuesta(200, ME_ADMIN) },
    );
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await ingresar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "acceso de administración",
    );
    expect(sesion.cerrarSesion).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("usuario sin registro completo → continúa en /registro", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "GET /me": errorApi(403, "REGISTRATION_REQUIRED"),
      },
    );
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await ingresar();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/registro"));
  });

  it("cuenta desactivada → mensaje y cierre de sesión", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": errorApi(403, "FORBIDDEN") },
    );
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await ingresar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "desactivada",
    );
    expect(sesion.cerrarSesion).toHaveBeenCalled();
  });

  it("backend caído → mensaje de conexión y sesión cerrada", async () => {
    const { sesion } = crearSesionFalsa();
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    await ingresar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos conectar con el servidor",
    );
    expect(sesion.cerrarSesion).toHaveBeenCalled();
  });

  it("sin Firebase configurado → aviso y botón deshabilitado", () => {
    const { sesion } = crearSesionFalsa({
      configurada: false,
      estado: "anonimo",
    });
    renderConSesion(<FormularioIngreso rol="cliente" />, sesion);
    expect(screen.getByText("Autenticación no configurada")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Ingresar" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("muestra el aviso de sesión expirada que deja la zona protegida", () => {
    const { sesion } = crearSesionFalsa({ estado: "anonimo" });
    renderConSesion(
      <FormularioIngreso rol="cliente" aviso="sesion-expirada" />,
      sesion,
    );
    expect(
      screen.getByText("Tu sesión expiró. Vuelve a iniciar sesión."),
    ).toBeTruthy();
  });

  it("ignora avisos desconocidos en la URL", () => {
    const { sesion } = crearSesionFalsa({ estado: "anonimo" });
    renderConSesion(
      <FormularioIngreso rol="cliente" aviso="<script>" />,
      sesion,
    );
    expect(screen.queryByText("<script>")).toBeNull();
  });
});

describe("F1-FE-01 · ingreso de administrador (UI-01)", () => {
  it("administrador válido → entra al Dashboard", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": respuesta(200, ME_ADMIN) },
    );
    renderConSesion(<FormularioIngreso rol="administrador" />, sesion);
    await ingresar("admin@ejemplo.test");
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/dashboard"),
    );
  });

  it("cliente en el acceso de administración → rechazo sin revelar más", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      { "GET /me": respuesta(200, ME_CLIENTE) },
    );
    renderConSesion(<FormularioIngreso rol="administrador" />, sesion);
    await ingresar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Esta cuenta no tiene acceso de administración.",
    );
    expect(sesion.cerrarSesion).toHaveBeenCalled();
    expect(screen.queryByText("Regístrate")).toBeNull();
  });
});

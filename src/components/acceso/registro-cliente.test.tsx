// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  crearSesionFalsa,
  errorApi,
  renderConSesion,
  respuesta,
} from "@/test/sesion-falsa";
import { RegistroCliente } from "./registro-cliente";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => replace.mockReset());
afterEach(cleanup);

async function completarDatos(clave = "segura123", confirmacion = clave) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Nombre"), "Ana");
  await user.type(screen.getByLabelText("Apellido"), "Prueba");
  await user.type(
    screen.getByLabelText("Correo electrónico"),
    "cliente.multimarca@ejemplo.test",
  );
  await user.type(screen.getByLabelText("Contraseña"), clave);
  await user.type(screen.getByLabelText("Confirmar contraseña"), confirmacion);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
  return user;
}

describe("F1-FE-01 · registro por pasos (UI-02, C10/C09)", () => {
  it("valida contraseña con número y confirmación antes de crear la cuenta", async () => {
    const { sesion } = crearSesionFalsa({ estado: "anonimo", usuario: null });
    renderConSesion(<RegistroCliente />, sesion);
    await completarDatos("sinnumero", "otra");
    expect(await screen.findByText("Incluye al menos un número.")).toBeTruthy();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy();
    expect(sesion.crearCuenta).not.toHaveBeenCalled();
  });

  it("no pide documento ni teléfono (no hay contrato que los guarde)", () => {
    const { sesion } = crearSesionFalsa({ estado: "anonimo", usuario: null });
    renderConSesion(<RegistroCliente />, sesion);
    expect(screen.queryByLabelText(/Documento/)).toBeNull();
    expect(screen.queryByLabelText(/Teléfono/)).toBeNull();
  });

  it("crea la cuenta y pasa a verificación del correo", async () => {
    const { sesion } = crearSesionFalsa({ estado: "anonimo", usuario: null });
    renderConSesion(<RegistroCliente />, sesion);
    await completarDatos();
    await waitFor(() =>
      expect(sesion.crearCuenta).toHaveBeenCalledWith({
        nombre: "Ana Prueba",
        correo: "cliente.multimarca@ejemplo.test",
        contrasena: "segura123",
      }),
    );
    expect(await screen.findByText("Verifica tu correo")).toBeTruthy();
  });

  it("correo aún sin verificar → aviso y no llama al registro", async () => {
    const { sesion, fetchImpl } = crearSesionFalsa({
      comprobarVerificacion: vi.fn(async () => false),
    });
    renderConSesion(<RegistroCliente />, sesion);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ya verifiqué mi correo" }));
    expect(
      await screen.findByText(/Aún no vemos tu correo verificado/),
    ).toBeTruthy();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("verificado y con coincidencia → muestra las marcas vinculadas", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "POST /clientes/registro": respuesta(201, {
          vinculo: "vinculado",
          marcas: ["zontes", "kiden"],
        }),
      },
    );
    renderConSesion(<RegistroCliente />, sesion);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ya verifiqué mi correo" }));
    const lista = await screen.findByRole("list", {
      name: "Marcas vinculadas",
    });
    expect(lista.textContent).toContain("Zontes");
    expect(lista.textContent).toContain("Kiden");
    expect(lista.textContent).not.toContain("NIU");
  });

  it("sin coincidencia → cuenta creada sin marcas, con mensaje explícito", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "POST /clientes/registro": respuesta(201, {
          vinculo: "no_vinculado",
          marcas: [],
        }),
      },
    );
    renderConSesion(<RegistroCliente />, sesion);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ya verifiqué mi correo" }));
    expect(
      await screen.findByText(/No encontramos un registro de cliente/),
    ).toBeTruthy();
    expect(
      screen.queryByRole("list", { name: "Marcas vinculadas" }),
    ).toBeNull();
  });

  it("correo ya vinculado a otra cuenta → mensaje del backend", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "POST /clientes/registro": errorApi(
          409,
          "EMAIL_ALREADY_LINKED",
          "Este correo ya está vinculado a otra cuenta.",
        ),
      },
    );
    renderConSesion(<RegistroCliente />, sesion);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ya verifiqué mi correo" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Este correo ya está vinculado a otra cuenta.",
    );
  });

  it("ya registrado → continúa a Mis marcas", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "POST /clientes/registro": errorApi(409, "ALREADY_REGISTERED"),
      },
    );
    renderConSesion(<RegistroCliente />, sesion);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Ya verifiqué mi correo" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/marcas"));
  });
});

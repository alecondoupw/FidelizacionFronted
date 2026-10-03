// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  crearSesionFalsa,
  errorApi,
  renderConSesion,
} from "@/test/sesion-falsa";
import { GuardiaRol } from "./guardia-rol";
import { VerificarCorreo } from "./verificar-correo";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
beforeEach(() => replace.mockReset());
afterEach(cleanup);

describe("F4 · verificación tras cambio de correo (DEC-04)", () => {
  it("la guardia envía a /verificar-correo cuando Express exige verificar", async () => {
    const { sesion } = crearSesionFalsa(
      {},
      {
        "GET /me": errorApi(
          403,
          "EMAIL_NOT_VERIFIED",
          "Verifica tu nuevo correo para continuar.",
        ),
      },
    );
    renderConSesion(
      <GuardiaRol rol="cliente" rutaAcceso="/ingresar">
        <p>Contenido protegido</p>
      </GuardiaRol>,
      sesion,
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/verificar-correo"),
    );
    expect(screen.queryByText("Contenido protegido")).toBeNull();
    expect(sesion.cerrarSesion).not.toHaveBeenCalled();
  });

  it("envía el enlace sólo al pedirlo y entra al confirmar la verificación", async () => {
    const { sesion } = crearSesionFalsa({
      comprobarVerificacion: vi
        .fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
    });
    renderConSesion(<VerificarCorreo />, sesion);
    expect(sesion.reenviarVerificacion).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar enlace de verificación" }),
    );
    expect(
      await screen.findByText("Te enviamos el enlace de verificación."),
    ).toBeTruthy();
    expect(sesion.reenviarVerificacion).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole("button", { name: "Ya lo verifiqué" }),
    );
    expect(
      await screen.findByText("Todavía no vemos el correo verificado."),
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Ya lo verifiqué" }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/inicio"));
  });
});

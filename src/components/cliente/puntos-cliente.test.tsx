// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import {
  crearSesionFalsa,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { Historial } from "./historial";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);

const mov = (
  id: string,
  marca: string,
  puntos: number,
  tipo = "otorgamiento",
  evento: string | null = "compra",
) => ({
  id,
  marca,
  tipo,
  puntos,
  fecha: "2026-10-02T15:00:00.000Z",
  venceEn: null,
  evento,
  motivo:
    tipo === "otorgamiento"
      ? null
      : "Vencimiento de puntos otorgados el 1 de septiembre de 2026",
});

function montar(ui: React.ReactElement, respuestas: Respuestas) {
  const r = crearSesionFalsa(
    {},
    { "GET /me": respuesta(200, ME_CLIENTE), ...respuestas },
  );
  renderConSesion(
    <GuardiaRol rol="cliente" rutaAcceso="/ingresar">
      {ui}
    </GuardiaRol>,
    r.sesion,
  );
  return r;
}

describe("F2-FE-01 · Historial (UI-14, C01)", () => {
  it("pagina con el cursor del backend y aplica filtros en la consulta", async () => {
    const { fetchImpl } = montar(<Historial />, {
      "GET /me/movimientos?limite=20": respuesta(200, {
        items: [mov("a", "zontes", 100)],
        siguiente: "cur-1",
      }),
      "GET /me/movimientos?limite=20&cursor=cur-1": respuesta(200, {
        items: [mov("b", "niu", -30, "vencimiento", null)],
        siguiente: null,
      }),
      "GET /me/movimientos?marca=niu&limite=20": respuesta(200, {
        items: [mov("b", "niu", -30, "vencimiento", null)],
        siguiente: null,
      }),
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cargar más" }));
    const tarjetas = await screen.findByRole("list", {
      name: "Movimientos de puntos",
    });
    await waitFor(() =>
      expect(within(tarjetas).getAllByRole("listitem")).toHaveLength(2),
    );
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
    expect(tarjetas.textContent).toContain("Vencimiento de puntos otorgados");

    await user.selectOptions(screen.getByLabelText("Marca"), "niu");
    await waitFor(() =>
      expect(
        fetchImpl.mock.calls.some(([u]) =>
          String(u).endsWith("/me/movimientos?marca=niu&limite=20"),
        ),
      ).toBe(true),
    );
    expect(
      screen.getByLabelText("Marca").querySelectorAll("option"),
    ).toHaveLength(3);
  });
});

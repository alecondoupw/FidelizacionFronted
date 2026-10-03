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
import { Inicio } from "./inicio";

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

describe("F2-FE-01 · Inicio (UI-13, C08)", () => {
  it("muestra saldo total, por marca y el próximo vencimiento del backend", async () => {
    montar(<Inicio />, {
      "GET /me/saldo": respuesta(200, {
        total: 1350,
        marcas: [
          {
            marca: "zontes",
            disponible: 1200,
            proximoVencimiento: {
              fecha: "2026-10-31T03:59:59.999Z",
              puntos: 1,
            },
          },
          { marca: "niu", disponible: 150, proximoVencimiento: null },
        ],
      }),
      "GET /me/movimientos?limite=5": respuesta(200, {
        items: [mov("a", "zontes", 100)],
        siguiente: null,
      }),
    });
    expect((await screen.findByTestId("saldo-total")).textContent).toBe(
      "1350".replace(/(\d)(?=(\d{3})+$)/, "$1."),
    );
    const porMarca = screen.getByRole("list", { name: "Saldo por marca" });
    expect(porMarca.textContent).toContain("Zontes");
    expect(porMarca.textContent).not.toContain("Kiden");
    expect(screen.getByText(/punto de Zontes vence el/)).toBeTruthy();
    expect(await screen.findAllByText("Compra")).not.toHaveLength(0);
  });

  it("si el saldo falla, muestra error con reintento sin ocultar el resto", async () => {
    montar(<Inicio />, {
      "GET /me/movimientos?limite=5": respuesta(200, {
        items: [],
        siguiente: null,
      }),
    });
    expect(await screen.findByText("No pudimos cargar tu saldo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(
      await screen.findAllByText("Todavía no hay movimientos para mostrar."),
    ).not.toHaveLength(0);
  });
});

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

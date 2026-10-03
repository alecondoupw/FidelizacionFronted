// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import {
  crearSesionFalsa,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
} from "@/test/sesion-falsa";
import { MisMarcas } from "./mis-marcas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

function montar(me: unknown = ME_CLIENTE) {
  const { sesion } = crearSesionFalsa({}, { "GET /me": respuesta(200, me) });
  return renderConSesion(
    <GuardiaRol rol="cliente" rutaAcceso="/ingresar">
      <MisMarcas />
    </GuardiaRol>,
    sesion,
  );
}

describe("F1-FE-02 · Mis marcas (UI-17, C02)", () => {
  it("muestra sólo las marcas confirmadas por el backend", async () => {
    montar();
    const lista = await screen.findByRole("list");
    const items = within(lista).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Zontes"),
      expect.stringContaining("NIU"),
    ]);
    expect(lista.textContent).not.toContain("Kiden");
  });

  it("la primera marca es la activa por defecto y se puede cambiar", async () => {
    montar();
    await screen.findByRole("list");
    expect(screen.getAllByText("Marca activa")).toHaveLength(1);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Usar como marca activa" }));
    const niu = screen.getAllByRole("listitem")[1]!;
    expect(within(niu).getByText("Marca activa")).toBeTruthy();
    expect(window.localStorage.getItem("fidelizacion.marcaActiva")).toBe("niu");
  });

  it("ignora una marca activa guardada que ya no está vinculada", async () => {
    window.localStorage.setItem("fidelizacion.marcaActiva", "kiden");
    montar();
    const zontes = (await screen.findAllByRole("listitem"))[0]!;
    expect(within(zontes).getByText("Marca activa")).toBeTruthy();
  });

  it("sin marcas → estado vacío explicativo", async () => {
    montar({ ...ME_CLIENTE, marcas: [], vinculo: "no_vinculado" });
    expect(
      await screen.findByText("Aún no tienes marcas vinculadas"),
    ).toBeTruthy();
  });

  it("«Vincular nueva marca» está deshabilitado y explica por qué (DEC-04)", async () => {
    montar();
    const boton = await screen.findByRole("button", {
      name: /Vincular nueva marca/,
    });
    expect(boton.hasAttribute("disabled")).toBe(true);
    expect(boton.getAttribute("aria-describedby")).toBe("nota-vincular");
  });
});

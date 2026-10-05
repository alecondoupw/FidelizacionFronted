// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
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

  it("sin control «Marca activa» (F9, DEC-20); conserva beneficios y novedades por marca", async () => {
    window.localStorage.setItem("fidelizacion.marcaActiva", "niu");
    montar();
    const zontes = (await screen.findAllByRole("listitem"))[0]!;
    expect(screen.queryByText(/Marca activa/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /marca activa/i })).toBeNull();
    expect(
      within(zontes)
        .getByRole("link", { name: "Ver beneficios de Zontes" })
        .getAttribute("href"),
    ).toBe("/catalogo?marca=zontes");
    expect(
      within(zontes)
        .getByRole("link", { name: "Ver novedades de Zontes" })
        .getAttribute("href"),
    ).toBe("/novedades?marca=zontes");
    // Retirar el control no borra la preferencia guardada en el navegador.
    expect(window.localStorage.getItem("fidelizacion.marcaActiva")).toBe("niu");
  });

  it("sin marcas → estado vacío explicativo", async () => {
    montar({ ...ME_CLIENTE, marcas: [], vinculo: "no_vinculado" });
    expect(
      await screen.findByText("Aún no tienes marcas vinculadas"),
    ).toBeTruthy();
  });

  it("explica que las marcas se vinculan por el correo, sin botón para vincular", async () => {
    montar();
    expect(await screen.findByText("¿Te falta una marca?")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Vincular/ })).toBeNull();
  });
});

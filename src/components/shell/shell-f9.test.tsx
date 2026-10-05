// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "@/app/admin/(panel)/layout";
import ClienteLayout from "@/app/(cliente)/layout";
import { PanelAcceso } from "@/components/acceso/panel-acceso";
import {
  crearSesionFalsa,
  ME_ADMIN,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
} from "@/test/sesion-falsa";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/novedades",
}));
afterEach(cleanup);

const montar = (ui: React.ReactElement, me: unknown) => {
  const { sesion } = crearSesionFalsa({}, { "GET /me": respuesta(200, me) });
  return renderConSesion(ui, sesion);
};

describe("F9-FE-05 · sidebar «Zontes» y Novedades (DEC-20)", () => {
  it("cliente: «Zontes» junto al icono y Novedades como destino del menú", async () => {
    montar(
      <ClienteLayout params={Promise.resolve({})}>
        <p>contenido</p>
      </ClienteLayout>,
      ME_CLIENTE,
    );
    const menu = await screen.findByRole("navigation", { name: "Principal" });
    const aside = menu.closest("aside")!;
    expect(within(aside).getByText("Zontes")).toBeTruthy();
    expect(within(aside).queryByText("MOTO LOYALTY")).toBeNull();
    const novedades = within(menu).getByRole("link", { name: "Novedades" });
    expect(novedades.getAttribute("href")).toBe("/novedades");
    expect(novedades.getAttribute("aria-current")).toBe("page");
    // En móvil queda dentro de «Más», sin perder Catálogo ni el cierre de sesión.
    const movil = screen.getByRole("navigation", { name: "Principal móvil" });
    expect(within(movil).getByRole("link", { name: "Catálogo" })).toBeTruthy();
    expect(within(movil).getByRole("button", { name: "Más" })).toBeTruthy();
  });

  it("administrador: «Zontes» en el sidebar y sin destino Novedades", async () => {
    montar(
      <AdminLayout params={Promise.resolve({})}>
        <p>contenido</p>
      </AdminLayout>,
      ME_ADMIN,
    );
    const menu = await screen.findByRole("navigation", { name: "Principal" });
    expect(within(menu.closest("aside")!).getByText("Zontes")).toBeTruthy();
    expect(within(menu).queryByRole("link", { name: "Novedades" })).toBeNull();
    expect(
      within(menu).getByRole("link", { name: "Publicaciones por marca" }),
    ).toBeTruthy();
  });
});

describe("F9-FE-06 · imágenes de ingreso y registro cliente (DEC-22)", () => {
  it("con imagen: panel visual con alt descriptivo y el formulario intacto", () => {
    render(
      <PanelAcceso
        imagen={{
          src: "/imagenes/ingresar-cliente.jpg",
          alt: "Tu pasión en un solo lugar.",
        }}
      >
        <form aria-label="Iniciar sesión">
          <label htmlFor="c">Correo electrónico</label>
          <input id="c" />
        </form>
      </PanelAcceso>,
    );
    const imagen = screen.getByRole("img", {
      name: "Tu pasión en un solo lugar.",
    });
    expect(decodeURIComponent(imagen.getAttribute("src")!)).toContain(
      "/imagenes/ingresar-cliente.jpg",
    );
    expect(imagen.getAttribute("width")).toBe("1086");
    expect(imagen.getAttribute("height")).toBe("1448");
    expect(screen.getByLabelText("Correo electrónico")).toBeTruthy();
  });

  it("acceso de administración: conserva su panel de texto, sin imágenes de cliente", () => {
    render(
      <PanelAcceso admin>
        <p>formulario</p>
      </PanelAcceso>,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Panel de administración")).toBeTruthy();
  });
});

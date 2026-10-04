// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import {
  crearSesionFalsa,
  errorApi,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { calcularAvisos, Inicio } from "./inicio";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
beforeEach(() => push.mockReset());
afterEach(cleanup);

const EN_10_DIAS = new Date(Date.now() + 10 * 86_400_000).toISOString();
const EN_90_DIAS = new Date(Date.now() + 90 * 86_400_000).toISOString();
const SALDO = {
  total: 1350,
  marcas: [
    {
      marca: "zontes",
      disponible: 1200,
      proximoVencimiento: { fecha: EN_10_DIAS, puntos: 200 },
    },
    {
      marca: "niu",
      disponible: 150,
      proximoVencimiento: { fecha: EN_90_DIAS, puntos: 150 },
    },
  ],
};
const canje = (codigo: string, estado: string) => ({
  codigo,
  beneficioId: "b1",
  beneficioNombre: "Casco",
  marca: "zontes",
  varianteNombre: "M",
  puntos: 100,
  estado,
  emitidoEn: "2026-10-01T15:00:00.000Z",
  venceEn: EN_90_DIAS,
  entregadoEn: null,
  anuladoEn: null,
  motivoAnulacion: null,
});
const destacada = {
  id: "p1",
  marca: "niu",
  categoria: "evento",
  titulo: "Rodada urbana NIU",
  texto: "Salida grupal de prueba.",
  enlace: null,
  destacada: true,
  publicarDesde: null,
};

function montar(extra: Respuestas = {}) {
  const respuestas: Respuestas = {
    "GET /me": respuesta(200, ME_CLIENTE),
    "GET /me/saldo": respuesta(200, SALDO),
    "GET /contenidos?destacadas=true&limite=5": respuesta(200, {
      items: [destacada],
    }),
    "GET /me/canjes?limite=20": respuesta(200, {
      items: [
        canje("ML-AAAA-BBBB-01", "emitido"),
        canje("ML-AAAA-BBBB-02", "entregado"),
      ],
      siguiente: null,
    }),
    "GET /reglas": respuesta(200, {
      items: [
        { marca: "zontes", evento: "compra", puntos: 100 },
        { marca: "niu", evento: "compra", puntos: 50 },
        { marca: "zontes", evento: "mantenimiento", puntos: 30 },
      ],
    }),
    ...extra,
  };
  const r = crearSesionFalsa({}, respuestas);
  renderConSesion(
    <GuardiaRol rol="cliente" rutaAcceso="/ingresar">
      <Inicio />
    </GuardiaRol>,
    r.sesion,
  );
  return r;
}

describe("F8-FE-05 · Inicio cliente (UI-13, SRC-06 pp. 4–5)", () => {
  it("saludo, banner, saldo informativo y por marca con datos reales", async () => {
    montar();
    expect(
      await screen.findByRole("heading", { name: "Hola de nuevo, Ana Prueba" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Explorar catálogo/ })
        .getAttribute("href"),
    ).toBe("/catalogo");
    expect((await screen.findByTestId("saldo-total")).textContent).toBe(
      "1.350",
    );
    expect(
      screen.getByRole("list", { name: "Saldo por marca" }).textContent,
    ).not.toContain("Kiden");
    // Puntos por vencer identifica la marca; ambas tarjetas llevan a Mis puntos.
    expect(screen.getByText(/^puntos de Zontes vencen el/)).toBeTruthy();
    for (const nombre of [
      "Ver detalles de mis puntos por marca",
      "Ver detalles de los puntos por vencer",
    ]) {
      expect(
        screen.getByRole("link", { name: nombre }).getAttribute("href"),
      ).toBe("/puntos");
    }
  });

  it("accesos rápidos, marcas vinculadas y formas de ganar según las reglas", async () => {
    montar();
    const accesos = await screen.findByRole("navigation", {
      name: "Accesos rápidos",
    });
    expect(
      within(accesos)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/catalogo", "/canjes", "/historial", "/perfil"]);
    const marcas = await screen.findByRole("list", {
      name: "Marcas vinculadas",
    });
    expect(
      within(marcas)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringMatching(/Zontes.*Vinculada.*1\.200/),
      expect.stringMatching(/NIU.*Vinculada.*150/),
    ]);
    expect(
      screen
        .getByRole("link", { name: "Gestionar marcas" })
        .getAttribute("href"),
    ).toBe("/marcas");
    const formas = await screen.findByRole("list", {
      name: "Formas de ganar puntos",
    });
    expect(formas.textContent).toContain("Zontes: 100 puntos · NIU: 50 puntos");
    expect(formas.textContent).toContain("Mantenimiento");
    // Sin regla activa no se muestran referidos ni eventos (punto 9).
    expect(formas.textContent).not.toContain("Referido");
    expect(formas.textContent).not.toContain("Asistencia");
  });

  it("la campana muestra avisos calculados y el banner rota las destacadas", async () => {
    montar();
    const user = userEvent.setup();
    const campana = await screen.findByRole("button", { name: "Avisos (3)" });
    await user.click(campana);
    const avisos = screen.getByRole("region", { name: "Avisos" });
    expect(
      within(avisos)
        .getAllByRole("link")
        .map((a) => [a.textContent, a.getAttribute("href")]),
    ).toEqual([
      [expect.stringMatching(/^200 puntos de Zontes vencen el/), "/puntos"],
      ["Tienes 1 canje por recoger en tienda.", "/canjes"],
      ["NIU: Rodada urbana NIU", "/novedades?marca=niu"],
    ]);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Avisos" })).toBeNull();

    const banner = screen.getByRole("region", { name: "Destacados" });
    await user.click(
      within(banner).getByRole("button", { name: "Destacado siguiente" }),
    );
    expect(within(banner).getByRole("heading").textContent).toBe(
      "Rodada urbana NIU",
    );
    expect(
      within(banner)
        .getByRole("link", { name: /Ver novedades de NIU/ })
        .getAttribute("href"),
    ).toBe("/novedades?marca=niu");
  });

  it("el buscador abre el catálogo filtrado", async () => {
    montar();
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Buscar beneficios o productos"),
      "casco integral{Enter}",
    );
    expect(push).toHaveBeenCalledWith("/catalogo?q=casco%20integral");
  });

  it("estados vacíos y error parcial sin ocultar el resto", async () => {
    montar({
      "GET /me/saldo": errorApi(500, "INTERNAL_ERROR", "Falló."),
      "GET /reglas": respuesta(200, { items: [] }),
      "GET /contenidos?destacadas=true&limite=5": errorApi(
        500,
        "INTERNAL_ERROR",
        "x",
      ),
    });
    expect(await screen.findByText("No pudimos cargar tu saldo")).toBeTruthy();
    expect(
      await screen.findByText(
        "Tus marcas aún no tienen formas de acumulación activas.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Explorar catálogo/ }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Destacado siguiente" }),
    ).toBeNull();
  });

  it("sin marcas vinculadas lo explica con claridad", async () => {
    montar({
      "GET /me/saldo": respuesta(200, { total: 0, marcas: [] }),
    });
    expect(
      await screen.findByText(/Todavía no tienes marcas vinculadas/),
    ).toBeTruthy();
    expect(
      screen.getByText("Aún no tienes marcas vinculadas para acumular puntos."),
    ).toBeTruthy();
    expect(
      screen.getByText("No tienes puntos próximos a vencer."),
    ).toBeTruthy();
  });
});

describe("avisos calculados (DEC-19)", () => {
  it("sólo vencimientos de los próximos 30 días y canjes por recoger", () => {
    const ahora = new Date("2026-10-04T12:00:00.000Z");
    expect(
      calcularAvisos({
        ahora,
        saldo: {
          total: 10,
          marcas: [
            {
              marca: "kiden",
              disponible: 10,
              proximoVencimiento: {
                fecha: "2026-12-01T03:59:59.999Z",
                puntos: 10,
              },
            },
          ],
        },
        canjesEmitidos: 0,
        destacadas: [],
      }),
    ).toEqual([]);
  });
});

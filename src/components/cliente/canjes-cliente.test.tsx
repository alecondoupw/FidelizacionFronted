// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
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
import { Catalogo } from "./catalogo";
import { DetalleBeneficio } from "./detalle-beneficio";
import { DetalleCanje } from "./detalle-canje";
import { MisCanjes } from "./mis-canjes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:local");
  URL.revokeObjectURL = vi.fn();
});

const beneficio = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  marca: "zontes",
  nombre: `Beneficio ${id}`,
  descripcion: "Descripción sintética",
  categoria: "accesorios",
  puntos: 500,
  caracteristicas: ["Original de marca"],
  disponibleDesde: null,
  vigenciaCuponDias: 30,
  disponibilidad: "disponible",
  variantes: [{ id: "unica", nombre: "Única", disponibilidad: "disponible" }],
  ...extra,
});

const canje = (codigo: string, extra: Record<string, unknown> = {}) => ({
  codigo,
  beneficioId: "casco",
  beneficioNombre: "Beneficio casco",
  marca: "zontes",
  varianteNombre: "M",
  puntos: 500,
  estado: "emitido",
  emitidoEn: "2026-10-03T14:00:00.000Z",
  venceEn: "2026-11-03T03:59:59.999Z",
  entregadoEn: null,
  anuladoEn: null,
  motivoAnulacion: null,
  ...extra,
});

const saldo = (disponible: number) =>
  respuesta(200, {
    total: disponible,
    marcas: [{ marca: "zontes", disponible, proximoVencimiento: null }],
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

const llamadas = (f: ReturnType<typeof crearSesionFalsa>["fetchImpl"]) =>
  f.mock.calls.map(
    ([u, i]) =>
      `${i?.method ?? "GET"} ${String(u).replace("http://be/api/v1", "")}`,
  );

describe("F3-FE-01 · Catálogo (UI-05, C06)", () => {
  it("lista beneficios con su disponibilidad y filtra por marca vinculada", async () => {
    const r = montar(<Catalogo />, {
      "GET /catalogo": respuesta(200, {
        items: [
          beneficio("a"),
          beneficio("b", { marca: "niu", disponibilidad: "agotado" }),
        ],
      }),
      "GET /catalogo?marca=niu": respuesta(200, {
        items: [beneficio("b", { marca: "niu", disponibilidad: "agotado" })],
      }),
    });
    expect(await screen.findByText("Beneficio a")).toBeTruthy();
    expect(screen.getByText("Agotado")).toBeTruthy();
    // Sólo marcas vinculadas en los filtros (ME_CLIENTE: zontes y niu).
    expect(screen.queryByRole("button", { name: "Kiden" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "NIU" }));
    await waitFor(() => expect(screen.queryByText("Beneficio a")).toBeNull());
    expect(llamadas(r.fetchImpl)).toContain("GET /catalogo?marca=niu");
  });

  it("respeta la marca inicial sólo si está vinculada", async () => {
    const r = montar(<Catalogo marcaInicial="kiden" />, {
      "GET /catalogo": respuesta(200, { items: [] }),
    });
    expect(await screen.findByText(/No hay beneficios/)).toBeTruthy();
    expect(llamadas(r.fetchImpl)).toContain("GET /catalogo");
  });
});

describe("F3-FE-02 · Detalle y canje (UI-05, C05)", () => {
  it("bloquea el canje si faltan puntos y lo explica", async () => {
    montar(<DetalleBeneficio id="a" />, {
      "GET /catalogo/a": respuesta(200, beneficio("a")),
      "GET /me/saldo": saldo(200),
    });
    expect(
      await screen.findByText("Te faltan 300 puntos de Zontes."),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Confirmar canje",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("muestra próximamente con su fecha y no deja canjear", async () => {
    montar(<DetalleBeneficio id="p" />, {
      "GET /catalogo/p": respuesta(
        200,
        beneficio("p", {
          disponibilidad: "proximamente",
          disponibleDesde: "2026-12-01T04:00:00.000Z",
          variantes: [
            { id: "unica", nombre: "Única", disponibilidad: "proximamente" },
          ],
        }),
      ),
      "GET /me/saldo": saldo(9000),
    });
    expect(await screen.findByText(/Disponible desde el/)).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Confirmar canje",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("confirma, canjea y muestra el código; reintenta con el mismo idSolicitud", async () => {
    const r = montar(<DetalleBeneficio id="a" />, {
      "GET /catalogo/a": respuesta(
        200,
        beneficio("a", {
          variantes: [
            { id: "s", nombre: "S", disponibilidad: "agotado" },
            { id: "m", nombre: "M", disponibilidad: "ultimas" },
          ],
        }),
      ),
      "GET /me/saldo": saldo(800),
      "POST /canjes": errorApi(409, "OUT_OF_STOCK", "Sin stock."),
    });
    // La opción agotada no se puede elegir; se preselecciona la disponible.
    expect(
      ((await screen.findByRole("radio", { name: /S/ })) as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("radio", { name: /M/ }) as HTMLInputElement).checked,
    ).toBe(true);
    expect(screen.getByText("300")).toBeTruthy(); // saldo después del canje

    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar canje" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Canjear" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Sin stock.",
    );

    r.fetchImpl.mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            canje: canje("ML-AAAA-BBBB-CC"),
            disponible: 300,
            repetido: false,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar canje" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Canjear" }),
    );
    expect(await screen.findByText("¡Canje realizado con éxito!")).toBeTruthy();
    expect(screen.getByTestId("codigo-canje").textContent).toBe(
      "ML-AAAA-BBBB-CC",
    );
    expect(
      screen.getByRole("link", { name: "Ver mis canjes" }).getAttribute("href"),
    ).toBe("/canjes");

    const cuerpos = r.fetchImpl.mock.calls
      .filter(([, i]) => i?.method === "POST")
      .map(([, i]) => JSON.parse(String(i?.body)));
    expect(cuerpos).toHaveLength(2);
    expect(cuerpos[0]).toMatchObject({ beneficioId: "a", varianteId: "m" });
    expect(cuerpos[1].idSolicitud).toBe(cuerpos[0].idSolicitud);
  });
});

describe("F3-FE-03 · Mis canjes y comprobante (UI-15/16, C04)", () => {
  it("lista los canjes con estado y enlace al detalle", async () => {
    montar(<MisCanjes />, {
      "GET /me/canjes?limite=20": respuesta(200, {
        items: [
          canje("ML-AAAA-BBBB-CC"),
          canje("ML-DDDD-EEEE-FF", { estado: "vencido" }),
        ],
        siguiente: null,
      }),
    });
    expect(await screen.findByText("ML-AAAA-BBBB-CC")).toBeTruthy();
    expect(screen.getByText("Vencido")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /Ver detalle del canje ML-DDDD-EEEE-FF/ })
        .getAttribute("href"),
    ).toBe("/canjes/ML-DDDD-EEEE-FF");
  });

  it("sin canjes invita a explorar el catálogo", async () => {
    montar(<MisCanjes />, {
      "GET /me/canjes?limite=20": respuesta(200, {
        items: [],
        siguiente: null,
      }),
    });
    expect(
      (
        await screen.findByRole("link", { name: "Explorar el catálogo" })
      ).getAttribute("href"),
    ).toBe("/catalogo");
  });

  it("muestra código, QR y descarga el comprobante", async () => {
    const r = montar(<DetalleCanje codigo="ML-AAAA-BBBB-CC" />, {
      "GET /me/canjes/ML-AAAA-BBBB-CC": respuesta(
        200,
        canje("ML-AAAA-BBBB-CC"),
      ),
      "GET /me/canjes/ML-AAAA-BBBB-CC/qr.svg": respuesta(200, "<svg/>"),
      "GET /me/canjes/ML-AAAA-BBBB-CC/comprobante": respuesta(200, "%PDF"),
    });
    expect((await screen.findByTestId("codigo-canje")).textContent).toBe(
      "ML-AAAA-BBBB-CC",
    );
    expect(
      (
        await screen.findByAltText("Código QR del canje ML-AAAA-BBBB-CC")
      ).getAttribute("src"),
    ).toBe("blob:local");
    await userEvent.click(
      screen.getByRole("button", { name: "Descargar comprobante" }),
    );
    await waitFor(() =>
      expect(llamadas(r.fetchImpl)).toContain(
        "GET /me/canjes/ML-AAAA-BBBB-CC/comprobante",
      ),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("un canje anulado no muestra QR y explica la devolución", async () => {
    montar(<DetalleCanje codigo="ML-AAAA-BBBB-CC" />, {
      "GET /me/canjes/ML-AAAA-BBBB-CC": respuesta(
        200,
        canje("ML-AAAA-BBBB-CC", {
          estado: "anulado",
          anuladoEn: "2026-10-04T14:00:00.000Z",
          motivoAnulacion: "Pedido del cliente",
        }),
      ),
    });
    expect(await screen.findByText(/los puntos se devolvieron/)).toBeTruthy();
    expect(screen.queryByAltText(/Código QR/)).toBeNull();
    expect(screen.getByText(/Pedido del cliente/)).toBeTruthy();
  });

  it("un canje ajeno o inexistente muestra error sin datos", async () => {
    montar(<DetalleCanje codigo="ML-ZZZZ-ZZZZ-ZZ" />, {
      "GET /me/canjes/ML-ZZZZ-ZZZZ-ZZ": errorApi(
        404,
        "NOT_FOUND",
        "No encontrado.",
      ),
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No encontrado.",
    );
    expect(screen.queryByTestId("codigo-canje")).toBeNull();
  });
});

// @vitest-environment jsdom
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { BeneficiosAdmin, idVariante } from "./beneficios";
import { CanjesAdmin } from "./canjes-admin";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);

const EN = "2026-10-03T12:00:00.000Z";
const beneficioAdmin = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  marca: "zontes",
  nombre: `Beneficio ${id}`,
  descripcion: "",
  categoria: "accesorios",
  puntos: 500,
  activo: true,
  disponibleDesde: null,
  vigenciaCuponDias: 30,
  caracteristicas: [],
  variantes: [{ id: "unica", nombre: "Única", stock: 3 }],
  actualizadoEn: EN,
  actualizadoPor: "u-2",
  ...extra,
});
const canje = (extra: Record<string, unknown> = {}) => ({
  codigo: "ML-AAAA-BBBB-CC",
  beneficioId: "a",
  beneficioNombre: "Beneficio a",
  marca: "zontes",
  varianteNombre: "Única",
  puntos: 500,
  estado: "emitido",
  emitidoEn: EN,
  venceEn: "2026-11-03T03:59:59.999Z",
  entregadoEn: null,
  anuladoEn: null,
  motivoAnulacion: null,
  ...extra,
});

function montar(ui: React.ReactElement, respuestas: Respuestas) {
  // Mismo objeto: las pruebas pueden cambiar respuestas después de montar.
  respuestas["GET /me"] = respuesta(200, ME_ADMIN);
  const r = crearSesionFalsa({}, respuestas);
  renderConSesion(
    <GuardiaRol rol="administrador" rutaAcceso="/admin/ingresar">
      {ui}
    </GuardiaRol>,
    r.sesion,
  );
  return r;
}

const cuerpos = (
  fetchImpl: ReturnType<typeof crearSesionFalsa>["fetchImpl"],
  metodo: string,
) =>
  fetchImpl.mock.calls
    .filter(([, init]) => init?.method === metodo)
    .map(([url, init]) => ({
      url: String(url).replace("http://be/api/v1", ""),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }));

describe("F3-FE-04 · Beneficios (UI-25, DEC-07)", () => {
  it("genera ids de opción legibles y únicos", () => {
    const usados = new Set(["m"]);
    expect(idVariante("Talla M", usados)).toBe("talla-m");
    expect(idVariante("M", usados)).toBe("m-2");
    expect(idVariante("Edición Ñandú", usados)).toBe("edicion-nandu");
    expect(idVariante("¡!", usados)).toBe("opcion");
  });

  it("lista beneficios con marca, stock y estado", async () => {
    montar(<BeneficiosAdmin />, {
      "GET /admin/beneficios": respuesta(200, {
        items: [
          beneficioAdmin("a"),
          beneficioAdmin("b", {
            marca: "niu",
            activo: false,
            variantes: [{ id: "u", nombre: "Única", stock: null }],
          }),
        ],
      }),
    });
    const lista = await screen.findByRole("list", { name: "Beneficios" });
    expect(within(lista).getByText(/3 en stock/)).toBeTruthy();
    expect(within(lista).getByText(/Sin límite/)).toBeTruthy();
    expect(within(lista).getByText("Inactivo")).toBeTruthy();
  });

  it("crea un beneficio con opciones y muestra los errores del backend", async () => {
    const respuestas: Respuestas = {
      "GET /admin/beneficios": respuesta(200, { items: [] }),
      "POST /admin/beneficios": respuesta(400, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos inválidos.",
          requestId: "r",
          details: [{ campo: "puntos", mensaje: "Debe ser positivo" }],
        },
      }),
    };
    const r = montar(<BeneficiosAdmin />, respuestas);
    await userEvent.click(
      await screen.findByRole("button", { name: "Nuevo beneficio" }),
    );
    await userEvent.type(screen.getByLabelText("Nombre"), "Casco");
    await userEvent.type(screen.getByLabelText("Puntos"), "0");
    await userEvent.clear(screen.getByLabelText("Opción 1"));
    await userEvent.type(screen.getByLabelText("Opción 1"), "Talla M");
    await userEvent.click(
      screen.getByRole("button", { name: "Agregar opción" }),
    );
    await userEvent.type(screen.getByLabelText("Opción 2"), "Talla L");
    await userEvent.click(screen.getAllByLabelText("Sin límite")[1]);
    await userEvent.click(
      screen.getByRole("button", { name: "Crear beneficio" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "puntos: Debe ser positivo",
    );

    respuestas["POST /admin/beneficios"] = respuesta(
      201,
      beneficioAdmin("casco"),
    );
    respuestas["GET /admin/beneficios"] = respuesta(200, {
      items: [beneficioAdmin("casco", { nombre: "Casco" })],
    });
    await userEvent.clear(screen.getByLabelText("Puntos"));
    await userEvent.type(screen.getByLabelText("Puntos"), "500");
    await userEvent.click(
      screen.getByRole("button", { name: "Crear beneficio" }),
    );
    expect(await screen.findByText("Beneficio creado.")).toBeTruthy();

    const enviado = cuerpos(r.fetchImpl, "POST").at(-1)!.body;
    expect(enviado).toMatchObject({
      marca: "zontes",
      nombre: "Casco",
      puntos: 500,
      vigenciaCuponDias: 30,
      disponibleDesde: null,
      variantes: [
        { id: "talla-m", nombre: "Talla M", stock: 10 },
        { id: "talla-l", nombre: "Talla L", stock: null },
      ],
    });
  });

  it("al editar conserva los ids de opción existentes y usa PUT", async () => {
    const r = montar(<BeneficiosAdmin />, {
      "GET /admin/beneficios": respuesta(200, { items: [beneficioAdmin("a")] }),
      "PUT /admin/beneficios/a": respuesta(200, beneficioAdmin("a")),
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Editar Beneficio a" }),
    );
    await userEvent.clear(screen.getByLabelText("Stock"));
    await userEvent.type(screen.getByLabelText("Stock"), "7");
    await userEvent.click(
      screen.getByRole("button", { name: "Guardar cambios" }),
    );
    expect(await screen.findByText(/Beneficio actualizado/)).toBeTruthy();
    expect(cuerpos(r.fetchImpl, "PUT")[0]).toMatchObject({
      url: "/admin/beneficios/a",
      body: { variantes: [{ id: "unica", nombre: "Única", stock: 7 }] },
    });
  });
});

describe("F3-FE-05 · Canjes por código (UI-26, DEC-07)", () => {
  it("busca un canje y lo marca como entregado", async () => {
    const r = montar(<CanjesAdmin />, {
      "GET /admin/canjes/ML-AAAA-BBBB-CC": respuesta(200, canje()),
      "POST /admin/canjes/ML-AAAA-BBBB-CC/entregar": respuesta(
        200,
        canje({ estado: "entregado", entregadoEn: EN }),
      ),
    });
    await userEvent.type(
      await screen.findByLabelText("Código de canje"),
      "ml-aaaa-bbbb-cc",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Beneficio a")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Marcar entregado" }),
    );
    expect(
      await screen.findByText("Canje marcado como entregado."),
    ).toBeTruthy();
    expect(screen.getByText("Entregado")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Anular canje",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(cuerpos(r.fetchImpl, "POST")).toHaveLength(1);
  });

  it("anular exige motivo y devuelve el resultado", async () => {
    const r = montar(<CanjesAdmin />, {
      "GET /admin/canjes/ML-AAAA-BBBB-CC": respuesta(
        200,
        canje({ estado: "vencido" }),
      ),
      "POST /admin/canjes/ML-AAAA-BBBB-CC/anular": respuesta(200, {
        canje: canje({
          estado: "anulado",
          anuladoEn: EN,
          motivoAnulacion: "Producto no disponible",
        }),
        disponible: 900,
      }),
    });
    await userEvent.type(
      await screen.findByLabelText("Código de canje"),
      "ML-AAAA-BBBB-CC",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    // Un canje vencido no se entrega, pero sí se puede anular.
    expect(
      (
        (await screen.findByRole("button", {
          name: "Marcar entregado",
        })) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Anular canje" }));
    const dialogo = await screen.findByRole("alertdialog");
    const confirmar = within(dialogo).getByRole("button", {
      name: "Anular canje",
    });
    expect((confirmar as HTMLButtonElement).disabled).toBe(true);
    await userEvent.type(
      within(dialogo).getByLabelText("Motivo"),
      "Producto no disponible",
    );
    await userEvent.click(confirmar);
    expect(await screen.findByText(/Se devolvieron 500 puntos/)).toBeTruthy();
    expect(cuerpos(r.fetchImpl, "POST")[0].body).toEqual({
      motivo: "Producto no disponible",
    });
  });

  it("un código inexistente muestra el error del backend", async () => {
    montar(<CanjesAdmin />, {
      "GET /admin/canjes/ML-ZZZZ-ZZZZ-ZZ": errorApi(
        404,
        "NOT_FOUND",
        "Canje no encontrado.",
      ),
    });
    await userEvent.type(
      await screen.findByLabelText("Código de canje"),
      "ML-ZZZZ-ZZZZ-ZZ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Canje no encontrado.",
    );
  });
});

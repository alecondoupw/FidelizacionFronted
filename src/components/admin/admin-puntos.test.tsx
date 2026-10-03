// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { resumenRegla } from "@/lib/formato";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { RegistrarPuntos } from "./registrar-puntos";
import { ReglasPuntos } from "./reglas";
import { VencimientoPuntos } from "./vencimiento";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);

const EN = "2026-10-03T12:00:00.000Z";
const regla = (
  marca: string,
  evento: string,
  puntos: number,
  activa = true,
) => ({
  id: `${marca}__${evento}`,
  marca,
  evento,
  puntos,
  activa,
  creadoEn: EN,
  actualizadoEn: EN,
  actualizadoPor: "u-2",
});

function montar(ui: React.ReactElement, respuestas: Respuestas) {
  // Mismo objeto: las pruebas pueden añadir respuestas después de montar.
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
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }));

describe("resumen dinámico de reglas (SRC-02 p. 5, punto 13)", () => {
  it("usa singular y plural correctamente", () => {
    expect(resumenRegla("mantenimiento", "Zontes", 50)).toBe(
      "Cada mantenimiento registrado otorga 50 puntos para Zontes.",
    );
    expect(resumenRegla("compra", "NIU", 1)).toBe(
      "Cada compra registrada otorga 1 punto para NIU.",
    );
    expect(resumenRegla("asistencia", "Kiden", 1500)).toBe(
      "Cada asistencia a eventos registrada otorga 1.500 puntos para Kiden.",
    );
  });
});

describe("F2-FE-02 · Reglas de puntos (UI-04, A05)", () => {
  const base = {
    "GET /admin/reglas": respuesta(200, {
      items: [
        regla("zontes", "compra", 100),
        regla("kiden", "referido", 200, false),
      ],
    }),
  };

  it("lista reglas sin campo de condición y filtra por estado", async () => {
    montar(<ReglasPuntos />, base);
    const lista = await screen.findByRole("list", { name: "Reglas de puntos" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/condici/i)).toBeNull();
    await userEvent
      .setup()
      .selectOptions(screen.getByLabelText("Estado"), "false");
    expect(within(lista).getAllByRole("listitem")).toHaveLength(1);
    expect(lista.textContent).toContain("Referido");
  });

  it("crea una regla mostrando el resumen antes de guardar", async () => {
    const { fetchImpl } = montar(<ReglasPuntos />, {
      ...base,
      "POST /admin/reglas": respuesta(201, regla("niu", "mantenimiento", 50)),
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Nueva regla" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await user.selectOptions(
      within(dialogo).getByLabelText("Tipo de evento"),
      "mantenimiento",
    );
    await user.selectOptions(within(dialogo).getByLabelText("Marca"), "niu");
    await user.type(within(dialogo).getByLabelText("Puntos"), "50");
    expect(screen.getByTestId("resumen-regla").textContent).toBe(
      "Cada mantenimiento registrado otorga 50 puntos para NIU.",
    );
    await user.click(screen.getByRole("button", { name: "Crear regla" }));
    await waitFor(() =>
      expect(cuerpos(fetchImpl, "POST")[0]?.body).toEqual({
        evento: "mantenimiento",
        marca: "niu",
        puntos: 50,
        activa: true,
      }),
    );
    expect(await screen.findByText("Regla creada.")).toBeTruthy();
  });

  it("no envía puntos negativos y muestra el conflicto del backend", async () => {
    const { fetchImpl } = montar(<ReglasPuntos />, {
      ...base,
      "POST /admin/reglas": errorApi(
        409,
        "RULE_EXISTS",
        "Ya existe una regla para ese evento y esa marca.",
      ),
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Nueva regla" }),
    );
    await user.type(screen.getByLabelText("Puntos"), "-5");
    await user.click(screen.getByRole("button", { name: "Crear regla" }));
    expect(await screen.findByText("Debe ser mayor que cero.")).toBeTruthy();
    expect(cuerpos(fetchImpl, "POST")).toHaveLength(0);
    await user.clear(screen.getByLabelText("Puntos"));
    await user.type(screen.getByLabelText("Puntos"), "10");
    await user.click(screen.getByRole("button", { name: "Crear regla" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ya existe una regla",
    );
  });

  it("activa/desactiva con PATCH y elimina sólo tras confirmar", async () => {
    const { fetchImpl } = montar(<ReglasPuntos />, {
      ...base,
      "PATCH /admin/reglas/zontes__compra": respuesta(
        200,
        regla("zontes", "compra", 100, false),
      ),
      "DELETE /admin/reglas/kiden__referido": { status: 204, body: null },
    });
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("switch", {
        name: /Desactivar regla Compra de Zontes/,
      }),
    );
    await waitFor(() =>
      expect(cuerpos(fetchImpl, "PATCH")[0]?.body).toEqual({ activa: false }),
    );

    await user.click(
      screen.getByRole("button", { name: "Eliminar regla Referido de Kiden" }),
    );
    expect(cuerpos(fetchImpl, "DELETE")).toHaveLength(0);
    expect(await screen.findByText("¿Eliminar esta regla?")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Eliminar regla" }));
    await waitFor(() =>
      expect(cuerpos(fetchImpl, "DELETE")[0]?.url).toContain(
        "/admin/reglas/kiden__referido",
      ),
    );
  });
});

describe("F2-FE-02 · Vencimiento (UI-19, A06)", () => {
  const vig = (
    marca: string,
    activa: boolean,
    cantidad = 12,
    unidad = "meses",
  ) => ({
    marca,
    activa,
    cantidad,
    unidad,
    actualizadoEn: null,
    actualizadoPor: null,
  });
  const resp = {
    "GET /admin/vigencias": respuesta(200, {
      items: [vig("zontes", true), vig("kiden", false), vig("niu", false)],
    }),
    "GET /admin/vigencias/zontes/historial": respuesta(200, {
      items: [
        {
          en: EN,
          actor: "u-2",
          antes: { activa: false, cantidad: 12, unidad: "meses" },
          despues: { activa: true, cantidad: 12, unidad: "meses" },
        },
      ],
    }),
    "GET /admin/vigencias/kiden/historial": respuesta(200, { items: [] }),
    "GET /admin/vigencias/niu/historial": respuesta(200, { items: [] }),
  };

  it("muestra el historial con el administrador actual como «Tú»", async () => {
    montar(<VencimientoPuntos />, resp);
    const h = await screen.findByRole("list", {
      name: "Historial de configuración",
    });
    expect(h.textContent).toContain("Sin vencimiento");
    expect(h.textContent).toContain("Vencen a los 12 meses");
    expect(h.textContent).toContain("Tú");
  });

  it("valida el máximo de 10 años y guarda con PUT", async () => {
    const { fetchImpl } = montar(<VencimientoPuntos />, {
      ...resp,
      "PUT /admin/vigencias/zontes": respuesta(
        200,
        vig("zontes", true, 18, "meses"),
      ),
    });
    const user = userEvent.setup();
    const periodo = await screen.findByLabelText("Periodo");
    await user.clear(periodo);
    await user.type(periodo, "11");
    await user.selectOptions(screen.getByLabelText("Unidad"), "anios");
    expect(screen.getByText("El periodo máximo es de 10 años.")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Guardar Zontes" })
        .hasAttribute("disabled"),
    ).toBe(true);
    await user.selectOptions(screen.getByLabelText("Unidad"), "meses");
    await user.clear(periodo);
    await user.type(periodo, "18");
    await user.click(screen.getByRole("button", { name: "Guardar Zontes" }));
    await waitFor(() =>
      expect(cuerpos(fetchImpl, "PUT")[0]?.body).toEqual({
        activa: true,
        cantidad: 18,
        unidad: "meses",
      }),
    );
  });
});

describe("DEC-05/14 · Registrar puntos (UI-24 propuesta)", () => {
  it("reintentar tras un fallo de red reutiliza la misma clave de idempotencia", async () => {
    const respuestas: Respuestas = {};
    const { fetchImpl } = montar(<RegistrarPuntos />, respuestas);
    const user = userEvent.setup();
    const formulario = (
      await screen.findByRole("button", { name: "Registrar evento" })
    ).closest("form")!;
    await user.type(
      within(formulario).getByLabelText("Correo del cliente"),
      "ana@ejemplo.test",
    );
    await user.click(
      within(formulario).getByRole("button", { name: "Registrar evento" }),
    );
    expect(
      (await within(formulario).findByRole("alert")).textContent,
    ).toContain("No pudimos conectar");

    respuestas["POST /admin/eventos"] = respuesta(201, {
      resultado: "otorgado",
      puntos: 100,
      movimientoId: "m1",
      venceEn: "2026-11-04T03:59:59.999Z",
      repetido: false,
    });
    await user.click(
      within(formulario).getByRole("button", { name: "Registrar evento" }),
    );
    expect(
      await within(formulario).findByText(
        /Evento registrado: 100 puntos de Zontes, vencen el/,
      ),
    ).toBeTruthy();
    const intentos = cuerpos(fetchImpl, "POST").filter((c) =>
      c.url.endsWith("/admin/eventos"),
    );
    expect(intentos).toHaveLength(2);
    expect(intentos[0]!.body.idExterno).toBe(intentos[1]!.body.idExterno);
  });

  it("informa un evento sin regla activa", async () => {
    montar(<RegistrarPuntos />, {
      "POST /admin/eventos": respuesta(201, {
        resultado: "sin_puntos",
        puntos: 0,
        motivo: "regla_inactiva",
        repetido: false,
      }),
    });
    const user = userEvent.setup();
    const formulario = (
      await screen.findByRole("button", { name: "Registrar evento" })
    ).closest("form")!;
    await user.type(
      within(formulario).getByLabelText("Correo del cliente"),
      "ana@ejemplo.test",
    );
    await user.click(
      within(formulario).getByRole("button", { name: "Registrar evento" }),
    );
    expect(
      await within(formulario).findByText(
        /sin puntos: la regla de ese evento está inactiva/,
      ),
    ).toBeTruthy();
  });

  it("el ajuste exige motivo y muestra el saldo insuficiente", async () => {
    montar(<RegistrarPuntos />, {
      "POST /admin/ajustes": errorApi(
        409,
        "INSUFFICIENT_BALANCE",
        "El saldo disponible (20 puntos) no alcanza para el ajuste.",
      ),
    });
    const user = userEvent.setup();
    const formulario = (
      await screen.findByRole("button", { name: "Aplicar ajuste" })
    ).closest("form")!;
    await user.type(
      within(formulario).getByLabelText("Correo del cliente"),
      "ana@ejemplo.test",
    );
    await user.type(within(formulario).getByLabelText(/Puntos/), "-50");
    await user.click(
      within(formulario).getByRole("button", { name: "Aplicar ajuste" }),
    );
    expect(
      await within(formulario).findByText(
        "Describe el motivo (mínimo 5 caracteres).",
      ),
    ).toBeTruthy();
    await user.type(
      within(formulario).getByLabelText("Motivo"),
      "Corrección de compra anulada",
    );
    await user.click(
      within(formulario).getByRole("button", { name: "Aplicar ajuste" }),
    );
    expect(
      (await within(formulario).findByRole("alert")).textContent,
    ).toContain("no alcanza");
  });
});

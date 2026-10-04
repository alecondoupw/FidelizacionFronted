// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { hoyEnBolivia, resumenRegla, sumarAnios } from "@/lib/formato";
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

describe("F8-FE-03 · Registrar puntos (UI-24, SRC-06 p. 3)", () => {
  const ana = {
    uid: "u-ana",
    nombre: "Ana Pérez",
    correo: "ana@ejemplo.test",
    marcas: ["zontes", "niu"],
    vinculo: "vinculado",
    activo: true,
    puntos: 40,
    creadoEn: EN,
    ultimoAcceso: null,
    verificacionPendiente: false,
  };
  const BUSCAR_ANA = "GET /admin/clientes?correo=ana%40ejemplo.test&limite=1";
  const hoy = hoyEnBolivia();
  const vence = sumarAnios(hoy, 1);

  async function prepararFormulario(respuestas: Respuestas) {
    respuestas[BUSCAR_ANA] ??= respuesta(200, {
      items: [ana],
      siguiente: null,
    });
    const r = montar(<RegistrarPuntos />, respuestas);
    const user = userEvent.setup();
    const formulario = await screen.findByRole("form", {
      name: "Ajuste de puntos",
    });
    await user.type(
      within(formulario).getByLabelText("Correo del cliente"),
      "ana@ejemplo.test",
    );
    await user.click(
      within(formulario).getByRole("button", { name: "Buscar" }),
    );
    await within(formulario).findByText("Ana Pérez");
    return { ...r, user, formulario };
  }

  it("sólo un formulario que suma: sin bloque de eventos ni restas", async () => {
    montar(<RegistrarPuntos />, {});
    expect(
      await screen.findByText(
        "Suma puntos a un cliente e indica el motivo y la fecha en que vencerán.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("form")).toHaveLength(1);
    expect(screen.queryByText(/Registrar evento/)).toBeNull();
    expect(screen.queryByLabelText("Evento")).toBeNull();
    expect(screen.queryByText(/resta/i)).toBeNull();
    expect(screen.getByLabelText("Puntos a sumar")).toBeTruthy();
    const fecha = screen.getByLabelText("¿Cuándo vencerán?");
    expect(fecha.getAttribute("min")).toBe(hoy);
    expect(fecha.getAttribute("max")).toBe(sumarAnios(hoy, 2));
  });

  it("busca al cliente por correo y ofrece sólo sus marcas vinculadas", async () => {
    const { formulario, user } = await prepararFormulario({
      "GET /admin/clientes?correo=nadie%40ejemplo.test&limite=1": respuesta(
        200,
        {
          items: [],
          siguiente: null,
        },
      ),
    });
    const marcas = within(formulario).getByLabelText("Marca");
    expect(
      [...marcas.querySelectorAll("option")].map((o) => o.textContent),
    ).toEqual(["Zontes", "NIU"]);
    // Otro correo sin cuenta: se avisa y no se puede elegir marca.
    const correo = within(formulario).getByLabelText("Correo del cliente");
    await user.clear(correo);
    await user.type(correo, "nadie@ejemplo.test{Enter}");
    expect(
      await within(formulario).findByText(
        "No hay un cliente registrado con ese correo.",
      ),
    ).toBeTruthy();
    expect(
      within(formulario).getByLabelText("Marca").hasAttribute("disabled"),
    ).toBe(true);
  });

  it("rechaza cero o negativos, exige motivo y fecha antes de confirmar", async () => {
    const { formulario, user, fetchImpl } = await prepararFormulario({});
    await user.type(within(formulario).getByLabelText("Puntos a sumar"), "-5");
    await user.click(
      within(formulario).getByRole("button", { name: "Revisar y registrar" }),
    );
    expect(
      await within(formulario).findByText(
        "Ingresa una cantidad mayor que cero.",
      ),
    ).toBeTruthy();
    expect(within(formulario).getByText(/mínimo 5 caracteres/)).toBeTruthy();
    expect(
      within(formulario).getByText("Elige la fecha de vencimiento."),
    ).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(cuerpos(fetchImpl, "POST")).toHaveLength(0);
  });

  it("confirma con todos los datos y registra una sola vez", async () => {
    let soltar!: () => void;
    const respuestas: Respuestas = {};
    const { formulario, user, fetchImpl } =
      await prepararFormulario(respuestas);
    respuestas["POST /admin/asignaciones"] = respuesta(201, {
      movimientoId: "m1",
      puntos: 120,
      venceEn: `${vence}T23:59:59.999-04:00`.replace("-04:00", "Z"),
      disponible: 160,
      repetido: false,
    });
    const original = fetchImpl.getMockImplementation()!;
    fetchImpl.mockImplementation(async (url, init) => {
      if (String(url).endsWith("/admin/asignaciones")) {
        await new Promise<void>((r) => (soltar = r));
      }
      return original(url, init);
    });

    await user.selectOptions(within(formulario).getByLabelText("Marca"), "niu");
    await user.type(within(formulario).getByLabelText("Puntos a sumar"), "120");
    await user.type(
      within(formulario).getByLabelText("Motivo"),
      "Compra de repuestos en tienda",
    );
    fireEvent.change(within(formulario).getByLabelText("¿Cuándo vencerán?"), {
      target: { value: vence },
    });
    await user.click(
      within(formulario).getByRole("button", { name: "Revisar y registrar" }),
    );
    const dialogo = await screen.findByRole("alertdialog");
    for (const texto of [
      "Ana Pérez · ana@ejemplo.test",
      "NIU",
      "120 puntos",
      "Compra de repuestos en tienda",
      "(fin del día)",
    ]) {
      expect(dialogo.textContent).toContain(texto);
    }
    const boton = within(dialogo).getByRole("button", {
      name: "Registrar puntos",
    });
    await user.click(boton);
    expect(
      within(dialogo).getByRole("button", { name: "Registrando…" }),
    ).toHaveProperty("disabled", true);
    soltar();
    expect(
      await screen.findByText(/Se sumaron 120 puntos a Ana Pérez en NIU/),
    ).toBeTruthy();
    const posts = cuerpos(fetchImpl, "POST");
    expect(posts).toHaveLength(1);
    expect(posts[0]!.body).toEqual({
      idSolicitud: expect.stringMatching(/^panel-/),
      correoCliente: "ana@ejemplo.test",
      marca: "niu",
      puntos: 120,
      motivo: "Compra de repuestos en tienda",
      vence,
    });
  });

  it("reintentar tras un fallo de red reutiliza la misma clave", async () => {
    const respuestas: Respuestas = {};
    const { formulario, user, fetchImpl } =
      await prepararFormulario(respuestas);
    const completar = async () => {
      await user.type(
        within(formulario).getByLabelText("Puntos a sumar"),
        "10",
      );
      await user.type(
        within(formulario).getByLabelText("Motivo"),
        "Compra en tienda",
      );
      fireEvent.change(within(formulario).getByLabelText("¿Cuándo vencerán?"), {
        target: { value: vence },
      });
      await user.click(
        within(formulario).getByRole("button", { name: "Revisar y registrar" }),
      );
      await user.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "Registrar puntos",
        }),
      );
    };
    await completar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos conectar",
    );
    respuestas["POST /admin/asignaciones"] = errorApi(
      422,
      "BRAND_NOT_LINKED",
      "El cliente no está vinculado a esa marca.",
    );
    await completar();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "no está vinculado",
    );
    const claves = cuerpos(fetchImpl, "POST").map((c) => c.body.idSolicitud);
    expect(claves).toHaveLength(2);
    expect(claves[0]).toBe(claves[1]);
  });
});

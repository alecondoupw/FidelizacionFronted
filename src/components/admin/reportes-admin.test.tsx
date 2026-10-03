// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { hoyBolivia, rangoDe } from "@/lib/periodos";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { ActividadAdmin } from "./actividad";
import { Dashboard } from "./dashboard";
import { Exportar } from "./exportar";
import { MovimientosAdmin } from "./movimientos";
import { ReporteCanjesAdmin } from "./reporte-canjes";
import { TendenciasAdmin } from "./tendencias";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
beforeEach(() => {
  // 3 oct 2026, 11:00 en Bolivia: los presets dependen de «hoy».
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-03T15:00:00.000Z"));
  URL.createObjectURL = vi.fn(() => "blob:local");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const R30 = "desde=2026-09-04&hasta=2026-10-03";
const sinVar = { absoluta: 0, porcentaje: null };

function montar(ui: React.ReactElement, respuestas: Respuestas) {
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
const urls = (f: ReturnType<typeof crearSesionFalsa>["fetchImpl"]) =>
  f.mock.calls.map(([u]) => String(u).replace("http://be/api/v1", ""));

describe("Periodos en hora de Bolivia", () => {
  it("calcula los presets desde el día local", () => {
    expect(hoyBolivia(new Date("2026-10-04T03:30:00.000Z"))).toBe("2026-10-03");
    expect(rangoDe("30d")).toEqual({
      desde: "2026-09-04",
      hasta: "2026-10-03",
    });
    expect(rangoDe("7d")).toEqual({ desde: "2026-09-27", hasta: "2026-10-03" });
    expect(rangoDe("6m")).toEqual({ desde: "2026-04-04", hasta: "2026-10-03" });
  });
});

describe("F5-FE-01 · Dashboard (UI-21, A13)", () => {
  const resumen = {
    periodo: { desde: "2026-09-04", hasta: "2026-10-03" },
    clientes: {
      total: 24,
      vinculados: 19,
      sinVincular: 5,
      nuevos: { valor: 4, variacion: { absoluta: 2, porcentaje: 100 } },
      porMarca: [
        { marca: "zontes", clientes: 8 },
        { marca: "kiden", clientes: 8 },
        { marca: "niu", clientes: 8 },
      ],
    },
    puntosOtorgados: {
      valor: 11400,
      variacion: { absoluta: 2270, porcentaje: 24.9 },
    },
    puntosUtilizados: {
      valor: 4900,
      variacion: { absoluta: -100, porcentaje: -2 },
      vencidos: 960,
    },
    canjes: { valor: 7, variacion: sinVar, pendientesDeEntrega: 6 },
    actividadMensual: [
      { desde: "2026-09-01", otorgados: 11400, utilizados: 4900 },
    ],
    canjesMensualesPorMarca: [
      { desde: "2026-09-01", zontes: 3, kiden: 2, niu: 2 },
    ],
    ultimosRegistros: [
      {
        uid: "u1",
        nombre: "Ana Prueba",
        marcas: ["zontes"],
        vinculo: "vinculado",
        creadoEn: "2026-10-01T15:00:00.000Z",
      },
    ],
    ultimosCanjes: [
      {
        codigo: "ML-1",
        beneficioNombre: "Kit de limpieza",
        cliente: "Beto",
        marca: "kiden",
        puntos: 600,
        estado: "emitido",
      },
    ],
  };

  it("muestra KPI con variación y cada uno abre su desglose", async () => {
    const r = montar(<Dashboard />, {
      "GET /admin/reportes/resumen": respuesta(200, resumen),
    });
    const otorgados = await screen.findByRole("link", {
      name: /Puntos otorgados/,
    });
    expect(otorgados.getAttribute("href")).toBe(
      `/admin/movimientos?${R30}&tipo=otorgamiento`,
    );
    expect(otorgados.textContent).toContain("11.400");
    expect(otorgados.textContent).toContain("+24,9%");
    expect(
      screen
        .getByRole("link", { name: /Puntos utilizados/ })
        .getAttribute("href"),
    ).toBe(`/admin/movimientos?${R30}&tipo=canje`);
    expect(
      screen.getByRole("link", { name: /Canjes realizados/ }).textContent,
    ).toContain("Sin datos del periodo anterior");
    expect(
      screen
        .getByRole("link", { name: /Clientes registrados/ })
        .getAttribute("href"),
    ).toBe("/admin/clientes");
    expect(screen.getByText("6 pendientes de entrega")).toBeTruthy();
    // Los datos del gráfico también están en una tabla accesible.
    const tabla = screen.getByRole("table", {
      name: "Puntos otorgados y utilizados por mes",
    });
    expect(within(tabla).getByText("11400")).toBeTruthy();
    expect(
      within(screen.getByRole("list", { name: "Últimos canjes" })).getByText(
        "Kit de limpieza",
      ),
    ).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() =>
      expect(
        urls(r.fetchImpl).filter((u) => u === "/admin/reportes/resumen"),
      ).toHaveLength(2),
    );
  });

  it("si el resumen falla muestra el error con reintento", async () => {
    montar(<Dashboard />, {
      "GET /admin/reportes/resumen": errorApi(500, "INTERNAL_ERROR", "Falló."),
    });
    expect((await screen.findByRole("alert")).textContent).toContain("Falló.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});

describe("F5-FE-01 · Actividad (UI-08, A10)", () => {
  const actividad = (marca: string | null) => ({
    periodo: { desde: "2026-09-04", hasta: "2026-10-03" },
    marca,
    usuariosConActividad: 23,
    nuevosRegistros: 4,
    puntosGenerados: 11400,
    puntosUtilizados: 4900,
    puntosVencidos: 960,
    ajustes: { positivos: 30, negativos: 20 },
    canjes: 7,
    canjesAnulados: 1,
    actividadesRegistradas: 43,
    porEvento: [
      { evento: "compra", movimientos: 21, puntos: 9300, clientes: 17 },
      { evento: "referido", movimientos: 4, puntos: 540, clientes: 4 },
      { evento: "mantenimiento", movimientos: 7, puntos: 1460, clientes: 6 },
      { evento: "asistencia", movimientos: 1, puntos: 100, clientes: 1 },
    ],
  });

  it("consulta el periodo y la marca, y enlaza cada evento a sus movimientos", async () => {
    const r = montar(<ActividadAdmin />, {
      [`GET /admin/reportes/actividad?${R30}`]: respuesta(200, actividad(null)),
      [`GET /admin/reportes/actividad?${R30}&marca=kiden`]: respuesta(
        200,
        actividad("kiden"),
      ),
      "GET /admin/reportes/actividad?desde=2026-09-27&hasta=2026-10-03":
        respuesta(200, actividad(null)),
    });
    expect(
      (
        await screen.findByRole("link", { name: /Puntos vencidos/ })
      ).getAttribute("href"),
    ).toBe(`/admin/movimientos?${R30}&tipo=vencimiento`);
    const eventos = screen.getByRole("list", {
      name: "Actividad por tipo de evento",
    });
    expect(
      within(eventos)
        .getByRole("link", { name: "Mantenimiento" })
        .getAttribute("href"),
    ).toBe(`/admin/movimientos?${R30}&tipo=otorgamiento&evento=mantenimiento`);
    expect(eventos.textContent).toContain("17 clientes");

    await userEvent.click(screen.getByRole("button", { name: "Kiden" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Últimos 7 días" }),
    );
    await waitFor(() =>
      expect(urls(r.fetchImpl)).toEqual(
        expect.arrayContaining([
          `/admin/reportes/actividad?${R30}&marca=kiden`,
          "/admin/reportes/actividad?desde=2026-09-27&hasta=2026-10-03&marca=kiden",
        ]),
      ),
    );
  });

  it("muestra el rechazo del backend a un rango personalizado de más de 12 meses", async () => {
    montar(<ActividadAdmin />, {
      [`GET /admin/reportes/actividad?${R30}`]: respuesta(200, actividad(null)),
      "GET /admin/reportes/actividad?desde=2025-01-01&hasta=2026-10-03":
        errorApi(
          422,
          "RANGE_TOO_LARGE",
          "El periodo puede abarcar como máximo 12 meses.",
        ),
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Personalizado" }),
    );
    const desde = screen.getByLabelText("Desde");
    await userEvent.clear(desde);
    await userEvent.type(desde, "2025-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "como máximo 12 meses",
    );
  });
});

describe("F5-FE-02 · Tendencias (UI-10, A11)", () => {
  const tendencia = (metrica: string, total: number) => ({
    metrica,
    marca: null,
    granularidad: "dia",
    actual: {
      desde: "2026-09-04",
      hasta: "2026-10-03",
      total,
      serie: [{ desde: "2026-09-04", valor: total }],
    },
    anterior: {
      desde: "2026-08-05",
      hasta: "2026-09-03",
      total: 9130,
      serie: [{ desde: "2026-08-05", valor: 9130 }],
    },
    variacion: {
      absoluta: total - 9130,
      porcentaje: ((total - 9130) / 9130) * 100,
    },
    porMarca: [
      { marca: "zontes", total: 3150 },
      { marca: "kiden", total: 3950 },
      { marca: "niu", total: 4300 },
    ],
  });

  it("compara con el periodo anterior y enlaza a los registros que la originan", async () => {
    const r = montar(<TendenciasAdmin />, {
      [`GET /admin/reportes/tendencias?metrica=otorgados&${R30}`]: respuesta(
        200,
        tendencia("otorgados", 11400),
      ),
      [`GET /admin/reportes/tendencias?metrica=canjes&${R30}`]: respuesta(
        200,
        tendencia("canjes", 7),
      ),
    });
    expect((await screen.findByTestId("total-actual")).textContent).toBe(
      "11.400",
    );
    expect(screen.getByText(/\+2\.270/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", {
          name: "Ver los registros que originan la tendencia",
        })
        .getAttribute("href"),
    ).toBe(`/admin/movimientos?${R30}&tipo=otorgamiento`);
    expect(
      within(screen.getByRole("table", { name: /por marca/ })).getByText(
        "4300",
      ),
    ).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Canjes" }));
    expect(
      (
        await screen.findByRole("link", {
          name: "Ver los registros que originan la tendencia",
        })
      ).getAttribute("href"),
    ).toBe(`/admin/reporte-canjes?${R30}`);
    expect(urls(r.fetchImpl)).toContain(
      `/admin/reportes/tendencias?metrica=canjes&${R30}`,
    );
  });
});

describe("F5-FE-01 · Movimientos (UI-20, A07)", () => {
  const mov = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    fecha: "2026-09-12T15:00:00.000Z",
    cliente: { nombre: "Ana Prueba", correo: "ana@ejemplo.test" },
    marca: "zontes",
    tipo: "otorgamiento",
    evento: "compra",
    puntos: 100,
    motivo: null,
    ...extra,
  });

  it("aplica los filtros recibidos, cambia de tipo, pagina y lleva los filtros a exportar", async () => {
    const base = "desde=2026-09-01&hasta=2026-09-30";
    const r = montar(
      <MovimientosAdmin
        inicial={{ desde: "2026-09-01", hasta: "2026-09-30", tipo: "canje" }}
      />,
      {
        [`GET /admin/movimientos?${base}&tipo=canje&limite=25`]: respuesta(
          200,
          {
            items: [
              mov("a", {
                tipo: "canje",
                evento: null,
                puntos: -600,
                motivo: "Canje: Kit",
              }),
            ],
            siguiente: "a",
          },
        ),
        [`GET /admin/movimientos?${base}&tipo=canje&limite=25&cursor=a`]:
          respuesta(200, {
            items: [
              mov("b", {
                tipo: "canje",
                evento: null,
                puntos: -50,
                cliente: { nombre: "Cliente eliminado", correo: null },
              }),
            ],
            siguiente: null,
          }),
        [`GET /admin/movimientos?${base}&tipo=otorgamiento&evento=referido&limite=25`]:
          respuesta(200, {
            items: [],
            siguiente: null,
          }),
      },
    );
    const lista = await screen.findByRole("list", { name: "Movimientos" });
    expect(lista.textContent).toContain("Canje: Kit");
    expect(lista.textContent).toContain("−600");
    expect(
      screen.getByRole("link", { name: /Exportar/ }).getAttribute("href"),
    ).toBe(`/admin/exportar?tipo=movimientos&${base}&tipoMovimiento=canje`);
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(await screen.findByText("Cliente eliminado")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Referido" }));
    expect(
      await screen.findByText("No hay movimientos con estos filtros."),
    ).toBeTruthy();
    expect(urls(r.fetchImpl)).toContain(
      `/admin/movimientos?${base}&tipo=otorgamiento&evento=referido&limite=25`,
    );
  });
});

describe("F5-FE-01 · Reporte de canjes (UI-09, A08)", () => {
  it("muestra totales, ranking y detalle, y filtra por estado y cliente", async () => {
    const reporte = (total: number) => ({
      periodo: { desde: "2026-09-04", hasta: "2026-10-03" },
      total,
      validos: total - 1,
      anulados: 1,
      puntosUtilizados: 11900,
      clientesConCanjes: 13,
      beneficiosMasCanjeados: [
        { beneficioId: "b1", nombre: "Kit de limpieza premium", canjes: 7 },
      ],
      porMarca: [
        { marca: "zontes", canjes: 8, puntos: 6900 },
        { marca: "kiden", canjes: 6, puntos: 4200 },
        { marca: "niu", canjes: 1, puntos: 800 },
      ],
      items: [
        {
          codigo: "ML-AAAA-BBBB-CC",
          cliente: { nombre: "Andrés", correo: "andres@ejemplo.test" },
          beneficioNombre: "Kit de limpieza premium",
          marca: "zontes",
          puntos: 600,
          estado: "emitido",
          emitidoEn: "2026-10-02T15:00:00.000Z",
        },
      ],
      siguiente: null,
    });
    const r = montar(<ReporteCanjesAdmin inicial={{}} />, {
      [`GET /admin/reportes/canjes?${R30}&limite=20`]: respuesta(
        200,
        reporte(17),
      ),
      [`GET /admin/reportes/canjes?${R30}&estado=anulado&limite=20`]: respuesta(
        200,
        reporte(2),
      ),
      [`GET /admin/reportes/canjes?${R30}&estado=anulado&correo=andres%40ejemplo.test&limite=20`]:
        respuesta(200, reporte(1)),
    });
    expect((await screen.findByTestId("total-canjes")).textContent).toBe("17");
    expect(screen.getByText("16 válidos · 1 anulados")).toBeTruthy();
    expect(
      within(screen.getByRole("list", { name: "Detalle de canjes" })).getByText(
        "ML-AAAA-BBBB-CC",
      ),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Anulado" }));
    expect(await screen.findByText("2")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Exportar/ }).getAttribute("href"),
    ).toBe(`/admin/exportar?tipo=canjes&${R30}&estado=anulado`);
    await userEvent.type(
      screen.getByLabelText("Cliente (correo completo)"),
      "andres@ejemplo.test",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(screen.getByTestId("total-canjes").textContent).toBe("1"),
    );
    expect(urls(r.fetchImpl)).toContain(
      `/admin/reportes/canjes?${R30}&estado=anulado&correo=andres%40ejemplo.test&limite=20`,
    );
  });
});

describe("F5-FE-03 · Exportar datos (UI-11, A12)", () => {
  it("vista previa con filtros, rechazo por volumen y descarga en Excel", async () => {
    const r = montar(<Exportar inicial={{}} />, {
      "GET /admin/exportaciones/clientes/vista-previa": respuesta(200, {
        filas: 8,
        columnas: [
          "Nombre",
          "Correo",
          "Marcas",
          "Vinculación",
          "Estado",
          "Fecha de registro",
        ],
        maximo: 10000,
      }),
      [`GET /admin/exportaciones/movimientos/vista-previa?${R30}`]: errorApi(
        422,
        "TOO_MANY_ROWS",
        "La exportación tendría 12000 filas; el máximo es 10000. Acota los filtros.",
      ),
      "GET /admin/exportaciones/clientes?formato=xlsx": respuesta(200, "PK"),
    });
    expect((await screen.findByTestId("filas-exportacion")).textContent).toBe(
      "8 registros con los filtros aplicados",
    );
    expect(screen.getByText(/Columnas: Nombre · Correo/)).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Generar exportación" }),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(urls(r.fetchImpl)).toContain(
      "/admin/exportaciones/clientes?formato=xlsx",
    );
    expect(
      within(
        screen.getByRole("list", { name: "Exportaciones de esta sesión" }),
      ).getByText("clientes-todos.xlsx"),
    ).toBeTruthy();

    // Movimientos exige periodo: se propone 30 días; el backend rechaza el volumen.
    await userEvent.click(screen.getByRole("button", { name: "Movimientos" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Acota los filtros",
    );
    expect((screen.getByLabelText("Desde") as HTMLInputElement).value).toBe(
      "2026-09-04",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Generar exportación",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("llega con los filtros de la pantalla de origen", async () => {
    const r = montar(
      <Exportar
        inicial={{
          tipo: "canjes",
          desde: "2026-09-01",
          hasta: "2026-09-30",
          estado: "anulado",
          marca: "kiden",
        }}
      />,
      {
        "GET /admin/exportaciones/canjes/vista-previa?desde=2026-09-01&hasta=2026-09-30&marca=kiden&estado=anulado":
          respuesta(200, {
            filas: 2,
            columnas: ["Código"],
            maximo: 10000,
          }),
      },
    );
    expect((await screen.findByTestId("filas-exportacion")).textContent).toBe(
      "2 registros con los filtros aplicados",
    );
    expect((screen.getByLabelText("Estado") as HTMLSelectElement).value).toBe(
      "anulado",
    );
    expect(urls(r.fetchImpl)).toContain(
      "/admin/exportaciones/canjes/vista-previa?desde=2026-09-01&hasta=2026-09-30&marca=kiden&estado=anulado",
    );
  });
});

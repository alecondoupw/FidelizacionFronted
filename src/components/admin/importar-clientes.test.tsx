// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { Clientes } from "./clientes";
import { ImportarClientes } from "./importar-clientes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const ID = "11111111-2222-4333-8444-555555555555";
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:local");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(crypto, "randomUUID").mockReturnValue(ID);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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

const fila = (
  n: number,
  estado: string,
  extra: Record<string, unknown> = {},
) => ({
  fila: n,
  nombre: `Persona ${n}`,
  correo: `p${n}@ejemplo.test`,
  estado,
  vinculacion: null,
  asociacionesPrevias: [],
  motivo: null,
  ...extra,
});
const resumen = {
  filas: 5,
  importados: 2,
  vinculados: 1,
  pendientes: 1,
  duplicados: 1,
  conflictos: 0,
  revision: 1,
  errores: 1,
};
const VISTA = {
  marca: "kiden",
  resumen,
  filas: [
    fila(2, "nuevo", { vinculacion: "pendiente" }),
    fila(3, "nueva_asociacion", {
      vinculacion: "vinculara",
      asociacionesPrevias: ["zontes"],
    }),
    fila(4, "duplicado_archivo", { motivo: "Repite el correo de la fila 2." }),
    fila(5, "revision", {
      motivo: "El correo pertenece a una cuenta administrativa.",
    }),
    fila(6, "error", {
      correo: "malo",
      motivo: "Correo electrónico inválido.",
    }),
  ],
};
const PREVIA = "POST /admin/importaciones/vista-previa?marca=kiden";
const CONFIRMAR = `POST /admin/importaciones?marca=kiden&archivo=clientes.csv&idImportacion=${ID}`;
const archivo = () =>
  new File(["nombre;correo\nAna;a@ejemplo.test\n"], "clientes.csv", {
    type: "text/csv",
  });

async function cargarArchivo(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(
    await screen.findByLabelText("Marca de origen"),
    "kiden",
  );
  await user.upload(screen.getByLabelText("Archivo CSV o XLSX"), archivo());
  await user.click(screen.getByRole("button", { name: "Ver vista previa" }));
}

describe("F8-FE-01 · Importar clientes (UI-23, SRC-06 pp. 1–2)", () => {
  it("vista previa por fila con excluidas indicadas, sin guardar", async () => {
    const { fetchImpl } = montar(<ImportarClientes />, {
      "GET /admin/importaciones": respuesta(200, { items: [] }),
      [PREVIA]: respuesta(200, VISTA),
    });
    const user = userEvent.setup();
    await cargarArchivo(user);
    const resumenUi = await screen.findByLabelText("Resumen de la importación");
    expect(resumenUi.textContent).toContain("Importados2");
    expect(resumenUi.textContent).toContain("Errores1");
    expect(screen.getByText(/3 filas quedan excluidas/)).toBeTruthy();
    const filas = screen.getByRole("list", { name: "Filas del archivo" });
    expect(within(filas).getAllByRole("listitem")).toHaveLength(5);
    expect(filas.textContent).toContain("Se vinculará a su cuenta");
    expect(filas.textContent).toContain("Ya en Zontes");
    await user.click(screen.getByRole("button", { name: "Errores" }));
    expect(
      within(screen.getByRole("list", { name: "Filas del archivo" }))
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([expect.stringContaining("Correo electrónico inválido.")]);
    // El archivo viaja tal cual al backend.
    const llamada = fetchImpl.mock.calls.find(([u]) =>
      String(u).includes("vista-previa"),
    )!;
    expect(llamada[1]!.body).toBeInstanceOf(Blob);
    expect(
      (llamada[1]!.headers as Record<string, string>)["Content-Type"],
    ).toBe("text/csv");
    expect(
      screen.getByRole("button", {
        name: "Confirmar importación (2 filas válidas)",
      }),
    ).toBeTruthy();
  });

  it("confirma las filas válidas, explica los indicadores y descarga el reporte", async () => {
    const { fetchImpl } = montar(<ImportarClientes />, {
      "GET /admin/importaciones": respuesta(200, { items: [] }),
      [PREVIA]: respuesta(200, VISTA),
      [CONFIRMAR]: respuesta(201, { id: ID, resumen, repetido: false }),
      [`GET /admin/importaciones/${ID}/reporte?formato=csv`]: respuesta(
        200,
        "x",
      ),
    });
    const user = userEvent.setup();
    await cargarArchivo(user);
    await user.click(
      await screen.findByRole("button", {
        name: "Confirmar importación (2 filas válidas)",
      }),
    );
    expect(
      await screen.findByText(/Importación de Kiden completada/),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Los vinculados pueden estar incluidos entre los importados/,
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reporte CSV" }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(
      fetchImpl.mock.calls.filter(([u]) => String(u).includes("idImportacion")),
    ).toHaveLength(1);
  });

  it("muestra el error del backend y permite cancelar la vista previa", async () => {
    const respuestas: Respuestas = {
      "GET /admin/importaciones": respuesta(200, { items: [] }),
      [PREVIA]: errorApi(
        422,
        "TOO_MANY_ROWS",
        "El archivo tiene 6000 filas; el máximo es 5000.",
      ),
    };
    montar(<ImportarClientes />, respuestas);
    const user = userEvent.setup();
    await cargarArchivo(user);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "6000 filas",
    );
    respuestas[PREVIA] = respuesta(200, VISTA);
    await user.click(screen.getByRole("button", { name: "Ver vista previa" }));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(screen.getByLabelText("Archivo CSV o XLSX")).toBeTruthy();
  });
});

describe("F8-FE-02 · Clientes: importar y pendientes de registro (UI-07)", () => {
  it("ofrece importar, no crear, y lista los importados sin cuenta", async () => {
    montar(<Clientes />, {
      "GET /admin/clientes?limite=20": respuesta(200, {
        items: [],
        siguiente: null,
      }),
      "GET /admin/importados?limite=20": respuesta(200, {
        items: [
          {
            correo: "carla@ejemplo.test",
            marcas: [
              {
                marca: "zontes",
                nombre: "Carla Ruiz",
                importadoEn: "2026-10-04T15:00:00.000Z",
              },
              {
                marca: "niu",
                nombre: "Carla Ruiz",
                importadoEn: "2026-10-04T15:00:00.000Z",
              },
            ],
            actualizadoEn: "2026-10-04T15:00:00.000Z",
          },
        ],
        siguiente: null,
      }),
    });
    const user = userEvent.setup();
    const enlace = await screen.findByRole("link", {
      name: "Importar clientes",
    });
    expect(enlace.getAttribute("href")).toBe("/admin/clientes/importar");
    expect(
      screen.queryByRole("button", { name: /Nuevo cliente|Crear cliente/ }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Pendientes de registro" }),
    );
    const lista = await screen.findByRole("list", {
      name: "Pendientes de registro",
    });
    expect(lista.textContent).toContain("Carla Ruiz");
    expect(lista.textContent).toContain("Zontes");
    expect(lista.textContent).toContain("NIU");
    expect(screen.queryByRole("group", { name: "Vinculación" })).toBeNull();
  });
});

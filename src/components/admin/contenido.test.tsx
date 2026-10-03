// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Inicio } from "@/components/cliente/inicio";
import { Novedades } from "@/components/cliente/novedades";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { ContenidoAdmin } from "./contenido";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
afterEach(cleanup);

const EN = "2026-10-03T12:00:00.000Z";
const admin = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  marca: "zontes",
  categoria: "noticia",
  titulo: `Publicación ${id}`,
  texto: "Texto de prueba",
  enlace: null,
  destacada: false,
  activa: true,
  publicarDesde: null,
  publicarHasta: null,
  estado: "publicada",
  visible: true,
  creadoEn: EN,
  actualizadoEn: EN,
  actualizadoPor: "u-2",
  ...extra,
});
const cliente = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  marca: "zontes",
  categoria: "evento",
  titulo: `Novedad ${id}`,
  texto: "Ruta La Paz – Coroico",
  enlace: "https://ejemplo.test/rodada",
  destacada: true,
  publicarDesde: "2026-09-29",
  ...extra,
});

function montar(
  ui: React.ReactElement,
  respuestas: Respuestas,
  me: typeof ME_ADMIN | typeof ME_CLIENTE = ME_ADMIN,
) {
  respuestas["GET /me"] = respuesta(200, me);
  const r = crearSesionFalsa({}, respuestas);
  renderConSesion(
    <GuardiaRol rol={me.rol} rutaAcceso="/x">
      {ui}
    </GuardiaRol>,
    r.sesion,
  );
  return r;
}
const cuerpos = (
  f: ReturnType<typeof crearSesionFalsa>["fetchImpl"],
  metodo: string,
) =>
  f.mock.calls
    .filter(([, i]) => i?.method === metodo)
    .map(([u, i]) => ({
      url: String(u).replace("http://be/api/v1", ""),
      body: i?.body ? JSON.parse(String(i.body)) : undefined,
    }));

describe("F6-FE-01 · Contenido por marca (UI-12, A09)", () => {
  const lista = [
    admin("a", { titulo: "Nueva Zontes 350T" }),
    admin("b", {
      titulo: "Temporada de mantenimiento",
      activa: false,
      estado: "programada",
      visible: false,
      publicarDesde: "2026-10-12",
      publicarHasta: "2026-11-11",
    }),
    admin("c", { marca: "kiden", titulo: "Kiden en ruta" }),
  ];

  it("separa por marca con conteos, filtra por estado y título", async () => {
    montar(<ContenidoAdmin />, {
      "GET /admin/contenidos": respuesta(200, { items: lista }),
    });
    const marcas = await screen.findByRole("group", { name: "Marca" });
    const zontes = within(marcas).getByRole("button", { name: /Zontes/ });
    expect(zontes.textContent).toContain("2");
    const tarjetas = () =>
      within(screen.getByRole("list", { name: /Contenido de/ })).getAllByRole(
        "listitem",
      );
    expect(tarjetas()).toHaveLength(2);
    expect(screen.getByText("Visible hoy para clientes")).toBeTruthy();
    expect(screen.getByText("12 oct 2026 – 11 nov 2026")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Programados" }));
    expect(
      tarjetas().map((t) => within(t).getByRole("heading").textContent),
    ).toEqual(["Temporada de mantenimiento"]);
    await userEvent.click(
      screen.getByRole("button", { name: "Cualquier fecha" }),
    );
    await userEvent.type(screen.getByLabelText("Buscar por título"), "350");
    expect(tarjetas()).toHaveLength(1);
    await userEvent.click(
      within(marcas).getByRole("button", { name: /Kiden/ }),
    );
    expect(
      await screen.findByText("Ninguna publicación coincide con los filtros."),
    ).toBeTruthy();
  });

  it("crea con vista previa en vivo y muestra los errores del backend", async () => {
    const respuestas: Respuestas = {
      "GET /admin/contenidos": respuesta(200, { items: [] }),
      "POST /admin/contenidos": respuesta(422, {
        error: {
          code: "VALIDATION_ERROR",
          message: "Los datos enviados no son válidos.",
          requestId: "r",
          details: [
            { campo: "enlace", mensaje: "Usa un enlace https completo." },
          ],
        },
      }),
    };
    const r = montar(<ContenidoAdmin />, respuestas);
    expect(await screen.findByText(/todavía no tiene contenido/)).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Nuevo contenido" }),
    );
    const dialogo = await screen.findByRole("dialog");
    await userEvent.selectOptions(
      within(dialogo).getByLabelText("Categoría"),
      "evento",
    );
    await userEvent.type(
      within(dialogo).getByLabelText("Título"),
      "Rodada Adventure",
    );
    await userEvent.type(
      within(dialogo).getByLabelText("Enlace (opcional)"),
      "http://inseguro.test",
    );
    // La vista previa refleja lo escrito y no muestra enlaces no https.
    const previa = within(dialogo).getByRole("article");
    expect(within(previa).getByRole("heading").textContent).toBe(
      "Rodada Adventure",
    );
    expect(previa.textContent).toContain("Evento");
    expect(within(previa).queryByRole("link")).toBeNull();
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Crear publicación" }),
    );
    expect((await within(dialogo).findByRole("alert")).textContent).toContain(
      "enlace: Usa un enlace https completo.",
    );

    respuestas["POST /admin/contenidos"] = respuesta(201, admin("n"));
    await userEvent.clear(within(dialogo).getByLabelText("Enlace (opcional)"));
    await userEvent.type(
      within(dialogo).getByLabelText("Publicar desde"),
      "2026-10-12",
    );
    await userEvent.click(
      within(dialogo).getByRole("switch", {
        name: /Destacada en el Inicio/,
      }),
    );
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Crear publicación" }),
    );
    expect(await screen.findByText("Publicación creada.")).toBeTruthy();
    expect(cuerpos(r.fetchImpl, "POST").at(-1)!.body).toEqual({
      marca: "zontes",
      categoria: "evento",
      titulo: "Rodada Adventure",
      texto: "",
      enlace: null,
      destacada: true,
      activa: false,
      publicarDesde: "2026-10-12",
      publicarHasta: null,
    });
  });

  it("activa con el interruptor, muestra vista previa y elimina tras confirmar", async () => {
    const r = montar(<ContenidoAdmin />, {
      "GET /admin/contenidos": respuesta(200, { items: lista }),
      "PATCH /admin/contenidos/b": respuesta(200, admin("b", { activa: true })),
      "DELETE /admin/contenidos/a": { status: 204, body: null },
    });
    await userEvent.click(
      await screen.findByRole("switch", {
        name: /Activar Temporada de mantenimiento/,
      }),
    );
    expect(
      await screen.findByText("«Temporada de mantenimiento» quedó activa."),
    ).toBeTruthy();
    expect(cuerpos(r.fetchImpl, "PATCH")[0]).toEqual({
      url: "/admin/contenidos/b",
      body: { activa: true },
    });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Vista previa de Temporada de mantenimiento",
      }),
    );
    expect((await screen.findByRole("dialog")).textContent).toContain(
      "cuando esté activa y dentro de su ventana",
    );
    await userEvent.keyboard("{Escape}");

    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar Nueva Zontes 350T" }),
    );
    const confirmar = await screen.findByRole("alertdialog");
    expect(cuerpos(r.fetchImpl, "DELETE")).toHaveLength(0);
    await userEvent.click(
      within(confirmar).getByRole("button", { name: "Eliminar" }),
    );
    await waitFor(() =>
      expect(cuerpos(r.fetchImpl, "DELETE")[0]!.url).toBe(
        "/admin/contenidos/a",
      ),
    );
  });
});

describe("F6 · contenido para el cliente (C08, Novedades)", () => {
  const saldo = respuesta(200, { total: 0, marcas: [] });
  const movimientos = respuesta(200, { items: [], siguiente: null });

  it("Inicio muestra el carrusel de destacadas con controles accesibles", async () => {
    montar(
      <Inicio />,
      {
        "GET /me/saldo": saldo,
        "GET /me/movimientos?limite=5": movimientos,
        "GET /contenidos?destacadas=true&limite=5": respuesta(200, {
          items: [
            cliente("1"),
            cliente("2", { marca: "niu", categoria: "promocion" }),
          ],
        }),
      },
      ME_CLIENTE,
    );
    const carrusel = await screen.findByRole("region", {
      name: "Novedades destacadas",
    });
    expect(within(carrusel).getByRole("heading").textContent).toBe("Novedad 1");
    expect(
      within(carrusel)
        .getByRole("link", { name: /Más información/ })
        .getAttribute("target"),
    ).toBe("_blank");
    await userEvent.click(
      within(carrusel).getByRole("button", { name: "Novedad siguiente" }),
    );
    expect(within(carrusel).getByRole("heading").textContent).toBe("Novedad 2");
    expect(
      within(carrusel)
        .getByRole("link", { name: /Ver novedades de NIU/ })
        .getAttribute("href"),
    ).toBe("/novedades?marca=niu");
    expect(
      screen.getByRole("link", { name: /Ver catálogo/ }).getAttribute("href"),
    ).toBe("/catalogo");
  });

  it("si el contenido falla, Inicio sigue mostrando saldo y accesos sin carrusel", async () => {
    montar(
      <Inicio />,
      {
        "GET /me/saldo": saldo,
        "GET /me/movimientos?limite=5": movimientos,
        "GET /contenidos?destacadas=true&limite=5": errorApi(
          500,
          "INTERNAL_ERROR",
          "Falló.",
        ),
      },
      ME_CLIENTE,
    );
    expect(await screen.findByRole("link", { name: /Novedades/ })).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Novedades destacadas" }),
    ).toBeNull();
  });

  it("Novedades filtra por marca vinculada y muestra estado vacío", async () => {
    const r = montar(
      <Novedades marcaInicial="kiden" />,
      {
        "GET /contenidos?limite=50": respuesta(200, {
          items: [cliente("1"), cliente("2", { marca: "niu" })],
        }),
        "GET /contenidos?marca=niu&limite=50": respuesta(200, { items: [] }),
      },
      ME_CLIENTE,
    );
    // «kiden» no está vinculada para ME_CLIENTE (zontes, niu): se ignora.
    expect(
      within(
        await screen.findByRole("list", { name: "Novedades" }),
      ).getAllByRole("article"),
    ).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "NIU" }));
    expect(
      await screen.findByText("No hay novedades publicadas por ahora."),
    ).toBeTruthy();
    expect(r.fetchImpl.mock.calls.map(([u]) => String(u))).toContain(
      "http://be/api/v1/contenidos?marca=niu&limite=50",
    );
  });
});

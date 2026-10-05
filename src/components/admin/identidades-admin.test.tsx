// @vitest-environment jsdom
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { MiPerfil } from "@/components/cuenta/mi-perfil";
import {
  crearSesionFalsa,
  errorApi,
  ME_ADMIN,
  ME_CLIENTE,
  renderConSesion,
  respuesta,
  type Respuestas,
} from "@/test/sesion-falsa";
import { Administradores } from "./administradores";
import { Clientes } from "./clientes";
import { DetalleClienteAdmin } from "./detalle-cliente";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
afterEach(() => {
  cleanup();
  replace.mockReset();
});

const EN = "2026-10-03T12:00:00.000Z";
const admin = (uid: string, extra: Record<string, unknown> = {}) => ({
  uid,
  nombre: `Admin ${uid}`,
  correo: `${uid}@ejemplo.test`,
  activo: true,
  creadoEn: EN,
  ultimoAcceso: EN,
  invitacionPendiente: false,
  ...extra,
});
const cliente = (uid: string, extra: Record<string, unknown> = {}) => ({
  uid,
  nombre: `Cliente ${uid}`,
  correo: `${uid}@ejemplo.test`,
  marcas: ["zontes"],
  vinculo: "vinculado",
  activo: true,
  puntos: 1200,
  creadoEn: EN,
  ultimoAcceso: null,
  verificacionPendiente: false,
  ...extra,
});
const detalle = (extra: Record<string, unknown> = {}) => ({
  ...cliente("c-1"),
  saldos: [{ marca: "zontes", disponible: 1200, vinculada: true }],
  historial: [
    {
      accion: "cliente.registrado",
      actor: "c-1",
      actorNombre: "Cliente c-1",
      en: EN,
      datos: { vinculo: "vinculado", marcas: ["zontes"] },
    },
  ],
  ...extra,
});

function montar(
  ui: React.ReactElement,
  respuestas: Respuestas,
  me: typeof ME_ADMIN | typeof ME_CLIENTE = ME_ADMIN,
) {
  // Mismo objeto: las pruebas pueden cambiar respuestas después de montar.
  respuestas["GET /me"] = respuesta(200, me);
  const r = crearSesionFalsa({}, respuestas);
  renderConSesion(
    <GuardiaRol
      rol={me.rol}
      rutaAcceso={me.rol === "cliente" ? "/ingresar" : "/admin/ingresar"}
    >
      {ui}
    </GuardiaRol>,
    r.sesion,
  );
  return r;
}

const llamadas = (
  f: ReturnType<typeof crearSesionFalsa>["fetchImpl"],
  metodo = "GET",
) =>
  f.mock.calls
    .filter(([, i]) => (i?.method ?? "GET") === metodo)
    .map(([u, i]) => ({
      url: String(u).replace("http://be/api/v1", ""),
      body: i?.body ? JSON.parse(String(i.body)) : undefined,
    }));

describe("F4-FE-01 · Administradores (UI-06, A03)", () => {
  it("marca la cuenta propia y no permite desactivarla ni eliminarla", async () => {
    montar(<Administradores />, {
      "GET /admin/administradores": respuesta(200, {
        items: [
          admin("u-2"),
          admin("u-9", {
            activo: false,
            invitacionPendiente: true,
            ultimoAcceso: null,
          }),
        ],
      }),
    });
    const lista = await screen.findByRole("list", { name: "Administradores" });
    const [propia, otra] = within(lista).getAllByRole("listitem");
    expect(within(propia!).getByText("Tú")).toBeTruthy();
    expect(
      (within(propia!).getByRole("switch") as HTMLButtonElement).getAttribute(
        "aria-disabled",
      ) ?? (within(propia!).getByRole("switch") as HTMLButtonElement).disabled,
    ).toBeTruthy();
    expect(
      (
        within(propia!).getByRole("button", {
          name: /Eliminar/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(within(otra!).getByText("Invitación pendiente")).toBeTruthy();
    expect(screen.getByText(/2 cuentas · 1 activas/)).toBeTruthy();
  });

  it("crea por invitación y pide a Firebase el correo para definir la contraseña", async () => {
    const respuestas: Respuestas = {
      "GET /admin/administradores": respuesta(200, { items: [admin("u-2")] }),
      "POST /admin/administradores": errorApi(
        409,
        "EMAIL_IN_USE",
        "Ese correo ya pertenece a otra cuenta.",
      ),
    };
    const r = montar(<Administradores />, respuestas);
    await userEvent.click(
      await screen.findByRole("button", { name: "Nuevo administrador" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear e invitar" }),
    );
    expect(await screen.findByText("Ingresa el nombre.")).toBeTruthy();

    await userEvent.type(screen.getByLabelText("Nombre"), "Rosa");
    await userEvent.type(screen.getByLabelText("Apellido"), "Pérez");
    await userEvent.type(
      screen.getByLabelText("Correo electrónico"),
      "rosa@ejemplo.test",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear e invitar" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ese correo ya pertenece a otra cuenta.",
    );
    expect(r.sesion.enviarCorreoContrasena).not.toHaveBeenCalled();

    respuestas["POST /admin/administradores"] = respuesta(
      201,
      admin("u-5", { correo: "rosa@ejemplo.test", invitacionPendiente: true }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear e invitar" }),
    );
    expect(
      await screen.findByText(/Enviamos a rosa@ejemplo.test/),
    ).toBeTruthy();
    expect(r.sesion.enviarCorreoContrasena).toHaveBeenCalledWith(
      "rosa@ejemplo.test",
      "/admin/ingresar",
    );
    expect(llamadas(r.fetchImpl, "POST").at(-1)!.body).toEqual({
      nombre: "Rosa",
      apellido: "Pérez",
      correo: "rosa@ejemplo.test",
    });
  });

  it("muestra el rechazo del backend al desactivar al último activo y confirma antes de eliminar", async () => {
    const r = montar(<Administradores />, {
      "GET /admin/administradores": respuesta(200, {
        items: [admin("u-2"), admin("u-3")],
      }),
      "PATCH /admin/administradores/u-3": errorApi(
        409,
        "LAST_ADMIN",
        "Debe existir al menos un administrador activo.",
      ),
      "DELETE /admin/administradores/u-3": { status: 204, body: null },
    });
    const lista = await screen.findByRole("list", { name: "Administradores" });
    await userEvent.click(
      within(lista).getByRole("switch", { name: /Desactivar a Admin u-3/ }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Debe existir al menos un administrador activo.",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Eliminar a Admin u-3" }),
    );
    const dialogo = await screen.findByRole("alertdialog");
    expect(llamadas(r.fetchImpl, "DELETE")).toHaveLength(0);
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Eliminar" }),
    );
    await waitFor(() =>
      expect(llamadas(r.fetchImpl, "DELETE")[0]!.url).toBe(
        "/admin/administradores/u-3",
      ),
    );
  });
});

describe("F4-FE-02 · Clientes (UI-07, A01)", () => {
  it("lista con vínculo y puntos del backend, filtra y busca por correo completo", async () => {
    const r = montar(<Clientes />, {
      "GET /admin/clientes?limite=20": respuesta(200, {
        items: [
          cliente("c-1"),
          cliente("c-2", {
            vinculo: "no_vinculado",
            marcas: [],
            puntos: 0,
            activo: false,
          }),
        ],
        siguiente: null,
      }),
      "GET /admin/clientes?marca=kiden&limite=20": respuesta(200, {
        items: [],
        siguiente: null,
      }),
      "GET /admin/clientes?marca=kiden&correo=c-1%40ejemplo.test&limite=20":
        respuesta(200, { items: [], siguiente: null }),
    });
    const lista = await screen.findByRole("list", { name: "Clientes" });
    expect(within(lista).getByText("No vinculado")).toBeTruthy();
    expect(within(lista).getByText("Inactivo")).toBeTruthy();
    expect(within(lista).getByText(/1\.200 pts/)).toBeTruthy();
    expect(
      within(lista)
        .getByRole("link", { name: "Gestionar a Cliente c-1" })
        .getAttribute("href"),
    ).toBe("/admin/clientes/c-1");

    await userEvent.click(screen.getByRole("button", { name: "Kiden" }));
    expect(
      await screen.findByText("No hay clientes que coincidan con los filtros."),
    ).toBeTruthy();
    await userEvent.type(
      screen.getByLabelText("Buscar por correo completo"),
      "c-1@ejemplo.test",
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(
      await screen.findByText("No hay un cliente con ese correo y filtros."),
    ).toBeTruthy();
    expect(llamadas(r.fetchImpl).map((l) => l.url)).toContain(
      "/admin/clientes?marca=kiden&correo=c-1%40ejemplo.test&limite=20",
    );
  });

  it("cambiar el correo exige confirmación y muestra el vínculo recalculado", async () => {
    const r = montar(<DetalleClienteAdmin uid="c-1" />, {
      "GET /admin/clientes/c-1": respuesta(200, detalle()),
      "PATCH /admin/clientes/c-1": respuesta(
        200,
        detalle({
          correo: "nuevo@ejemplo.test",
          marcas: ["kiden"],
          verificacionPendiente: true,
          saldos: [
            { marca: "kiden", disponible: 0, vinculada: true },
            { marca: "zontes", disponible: 1200, vinculada: false },
          ],
        }),
      ),
    });
    const correo = await screen.findByLabelText("Correo electrónico");
    await userEvent.clear(correo);
    await userEvent.type(correo, "Nuevo@Ejemplo.test");
    await userEvent.click(
      screen.getByRole("button", { name: /Guardar cambios/ }),
    );
    const dialogo = await screen.findByRole("alertdialog");
    expect(llamadas(r.fetchImpl, "PATCH")).toHaveLength(0);
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Cambiar correo" }),
    );
    expect(
      await screen.findByText(/El vínculo se recalculó \(Kiden\)/),
    ).toBeTruthy();
    expect(llamadas(r.fetchImpl, "PATCH")[0]!.body).toEqual({
      correo: "Nuevo@Ejemplo.test",
    });
    expect(screen.getByText("Verificación de correo pendiente")).toBeTruthy();
    expect(screen.getByText("Sin vínculo · saldo conservado")).toBeTruthy();
    expect(screen.getByText("Registro de la cuenta")).toBeTruthy();
  });

  it("desactiva con el interruptor y elimina tras confirmar", async () => {
    const r = montar(<DetalleClienteAdmin uid="c-1" />, {
      "GET /admin/clientes/c-1": respuesta(200, detalle()),
      "PATCH /admin/clientes/c-1": respuesta(200, detalle({ activo: false })),
      "DELETE /admin/clientes/c-1": { status: 204, body: null },
    });
    await userEvent.click(
      await screen.findByRole("switch", { name: /Desactivar cliente/ }),
    );
    expect(await screen.findByText(/Cuenta desactivada/)).toBeTruthy();
    expect(llamadas(r.fetchImpl, "PATCH")[0]!.body).toEqual({ activo: false });

    await userEvent.click(
      screen.getByRole("button", { name: /Eliminar cliente/ }),
    );
    const dialogo = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Eliminar definitivamente" }),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/clientes"),
    );
    expect(llamadas(r.fetchImpl, "DELETE")).toHaveLength(1);
  });
});

describe("F4-FE-03 · Edición de perfil permitida (UI-18/22, DEC-08)", () => {
  it("el cliente edita sólo su nombre y pide el correo para cambiar la contraseña", async () => {
    const r = montar(
      <MiPerfil rutaAcceso="/ingresar" />,
      { "PATCH /me": { status: 204, body: null } },
      ME_CLIENTE,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Editar nombre" }),
    );
    const nombre = screen.getByLabelText("Nombre");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Ana María");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Nombre actualizado.")).toBeTruthy();
    expect(llamadas(r.fetchImpl, "PATCH")[0]).toEqual({
      url: "/me",
      body: { nombre: "Ana María" },
    });
    expect(r.sesion.recargarUsuario).toHaveBeenCalled();
    // No hay campo de correo editable.
    expect(screen.queryByLabelText("Correo electrónico")).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: "Cambiar contraseña" }),
    );
    expect(r.sesion.enviarCorreoContrasena).toHaveBeenCalledWith(
      "cliente.zontes@ejemplo.test",
      "/ingresar",
    );
    expect(
      await screen.findByText(
        "Enviamos el enlace a cliente.zontes@ejemplo.test.",
      ),
    ).toBeTruthy();
  });

  it("F9-FE-02: la información de cuenta del cliente no muestra vínculo ni marcas", async () => {
    montar(<MiPerfil rutaAcceso="/ingresar" />, {}, ME_CLIENTE);
    const tarjeta = (
      await screen.findByRole("heading", { name: "Información de la cuenta" })
    ).closest("section")!;
    expect(tarjeta.textContent).toContain("cliente.zontes@ejemplo.test");
    expect(tarjeta.textContent).not.toMatch(/Vínculo|vinculad|Zontes ·|Marcas/);
    expect(tarjeta.textContent).not.toContain("NIU");
    expect(screen.getByText(/Tus marcas están en Mis marcas/)).toBeTruthy();
  });
});

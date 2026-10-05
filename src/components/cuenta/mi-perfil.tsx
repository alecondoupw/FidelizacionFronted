"use client";

import { KeyRound, LogOut, Pencil, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Campo } from "@/components/acceso/campo";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { actualizarMiNombre } from "@/lib/api/identidades";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";

const FECHA = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * UI-18 (cliente, C03) y UI-22 (admin, A04). Según DEC-08 cada persona edita
 * sólo su nombre; el correo lo cambia un administrador y la contraseña se
 * cambia con el correo de restablecimiento de Firebase (F4-FE-03).
 */
export function MiPerfil({ rutaAcceso }: { rutaAcceso: string }) {
  const me = usePerfil();
  const sesion = useSesion();
  const router = useRouter();
  const usuario = sesion.usuario;
  const admin = me.rol === "administrador";
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const accion = async (fn: () => Promise<string>) => {
    setOcupado(true);
    setAviso(null);
    try {
      setAviso({ tipo: "ok", texto: await fn() });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setOcupado(false);
    }
  };

  const cerrarSesion = async () => {
    await sesion.cerrarSesion();
    router.replace(`${rutaAcceso}?aviso=sesion-cerrada`);
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Mi perfil"
        descripcion={
          admin
            ? "Cuenta administrativa y sesión."
            : "Datos de tu cuenta y sesión."
        }
      />
      {aviso && (
        <Alert
          className="mb-4"
          variant={aviso.tipo === "error" ? "destructive" : "default"}
          role={aviso.tipo === "error" ? "alert" : "status"}
        >
          <AlertDescription>{aviso.texto}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Información de la cuenta"
          icono={<UserRound aria-hidden="true" className="size-5" />}
        >
          <dl className="divide-y">
            {editando ? (
              <form
                noValidate
                className="flex flex-col gap-3 py-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void accion(async () => {
                    await actualizarMiNombre(sesion.api(), nombre.trim());
                    await sesion.recargarUsuario();
                    setEditando(false);
                    return "Nombre actualizado.";
                  });
                }}
              >
                <Campo
                  id="mi-nombre"
                  etiqueta="Nombre"
                  value={nombre}
                  maxLength={80}
                  autoComplete="name"
                  onChange={(e) => setNombre(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={ocupado || nombre.trim().length < 2}
                  >
                    {ocupado ? "Guardando…" : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setNombre(usuario?.nombre ?? "");
                      setEditando(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <Fila etiqueta="Nombre">
                <span className="inline-flex items-center gap-2">
                  {usuario?.nombre || "—"}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar nombre"
                    onClick={() => setEditando(true)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                </span>
              </Fila>
            )}
            <Fila etiqueta="Correo electrónico">
              <span className="break-all">{usuario?.correo ?? "—"}</span>
            </Fila>
            <Fila etiqueta="Rol">
              <Badge variant="secondary">
                {admin ? "Administrador" : "Cliente"}
              </Badge>
            </Fila>
            <Fila etiqueta="Estado">
              <Badge className="bg-exito-suave text-exito">
                {me.activo ? "Activa" : "Inactiva"}
              </Badge>
            </Fila>
          </dl>
          <p className="text-xs text-muted-foreground">
            {admin
              ? "El correo de acceso no se cambia desde aquí."
              : "El correo sólo lo cambia un administrador. Tus marcas están en Mis marcas."}
          </p>
        </Tarjeta>

        <Tarjeta
          titulo="Sesión"
          icono={<ShieldCheck aria-hidden="true" className="size-5" />}
        >
          <dl className="divide-y">
            <Fila etiqueta="Último inicio de sesión">
              {usuario?.ultimoIngreso
                ? FECHA.format(new Date(usuario.ultimoIngreso))
                : "—"}
            </Fila>
            <Fila etiqueta="Al cerrar sesión">
              Se cierra el acceso en este dispositivo
            </Fila>
          </dl>
          <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4 text-sm">
            <p className="font-semibold">Contraseña</p>
            <p className="text-muted-foreground">
              Te enviaremos un enlace a tu correo para elegir una nueva.
            </p>
            <Button
              variant="outline"
              className="h-10 w-fit"
              disabled={ocupado || !usuario?.correo}
              onClick={() =>
                accion(async () => {
                  await sesion.enviarCorreoContrasena(
                    usuario!.correo!,
                    rutaAcceso,
                  );
                  return `Enviamos el enlace a ${usuario!.correo}.`;
                })
              }
            >
              <KeyRound aria-hidden="true" />
              Cambiar contraseña
            </Button>
          </div>
          <Button
            variant="destructive"
            className="h-10 w-fit"
            onClick={cerrarSesion}
          >
            <LogOut aria-hidden="true" />
            Cerrar sesión
          </Button>
        </Tarjeta>
      </div>
    </>
  );
}

function Tarjeta({
  titulo,
  icono,
  children,
}: {
  titulo: string;
  icono: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-bold">
        <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-acento">
          {icono}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Fila({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium sm:text-right">{children}</dd>
    </div>
  );
}

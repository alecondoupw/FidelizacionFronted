"use client";

import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSesion } from "@/lib/auth/sesion";
import { NOMBRE_MARCA } from "@/lib/marcas";

const FECHA = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * UI-18 (cliente, C03) y UI-22 (admin, A04), sólo consulta (F1-FE-03).
 * La edición de datos y el cambio de contraseña esperan DEC-08 (F4-FE-03).
 */
export function MiPerfil({ rutaAcceso }: { rutaAcceso: string }) {
  const me = usePerfil();
  const sesion = useSesion();
  const router = useRouter();
  const usuario = sesion.usuario;
  const admin = me.rol === "administrador";

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
            : "Datos de tu cuenta y marcas vinculadas."
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Información de la cuenta"
          icono={<UserRound aria-hidden="true" className="size-5" />}
        >
          <dl className="divide-y">
            <Fila etiqueta="Nombre">{usuario?.nombre || "—"}</Fila>
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
            {!admin && (
              <>
                <Fila etiqueta="Vínculo con clientes existentes">
                  {me.vinculo === "vinculado" ? "Vinculada" : "Sin vínculo"}
                </Fila>
                <Fila etiqueta="Marcas">
                  {me.marcas.length
                    ? me.marcas.map((m) => NOMBRE_MARCA[m]).join(", ")
                    : "Ninguna"}
                </Fila>
              </>
            )}
          </dl>
          <p className="text-xs text-muted-foreground">
            La edición de datos estará disponible en una próxima fase.
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
        <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
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

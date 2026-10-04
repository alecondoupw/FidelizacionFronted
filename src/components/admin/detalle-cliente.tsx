"use client";

import { History, Layers, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Campo } from "@/components/acceso/campo";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  actualizarCliente,
  eliminarCliente,
  getCliente,
  type DetalleCliente,
} from "@/lib/api/identidades";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  detalleAccion,
  formatoFecha,
  formatoFechaHora,
  formatoPuntos,
  NOMBRE_ACCION,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { EtiquetaEstado, EtiquetaVinculo } from "./clientes";

/** Detalle y gestión de un cliente (UI-07, DEC-04/08). */
export function DetalleClienteAdmin({ uid }: { uid: string }) {
  const sesion = useSesion();
  const me = usePerfil();
  const [datos, setDatos] = useState<DetalleCliente | null>(null);
  const { carga, recargar } = useCarga(async () => {
    const d = await getCliente(sesion.api(), uid);
    setDatos(null);
    return d;
  }, [me.uid, uid]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link
          href="/admin/clientes"
          className="hover:text-foreground hover:underline"
        >
          Clientes
        </Link>
        <span aria-hidden="true"> › </span>
        <span aria-current="page">Detalle</span>
      </nav>
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="el cliente"
        alto="h-80"
      >
        {(inicial) => (
          <Contenido c={datos ?? inicial} alCambiar={(d) => setDatos(d)} />
        )}
      </EstadoCarga>
    </div>
  );
}

function Contenido({
  c,
  alCambiar,
}: {
  c: DetalleCliente;
  alCambiar: (d: DetalleCliente) => void;
}) {
  const sesion = useSesion();
  const router = useRouter();
  const importadaEn = (marca: DetalleCliente["marcas"][number]) => {
    const i = c.importadas.find((x) => x.marca === marca);
    return i
      ? `Importado como «${i.nombre}» el ${formatoFecha(i.importadoEn)}`
      : null;
  };
  const [nombre, setNombre] = useState(c.nombre ?? "");
  const [correo, setCorreo] = useState(c.correo);
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmandoCorreo, setConfirmandoCorreo] = useState(false);

  const correoCambia = correo.trim().toLowerCase() !== c.correo;
  const nombreCambia = nombre.trim() !== (c.nombre ?? "");

  const guardar = async (cambios: Parameters<typeof actualizarCliente>[2]) => {
    setOcupado(true);
    setAviso(null);
    try {
      const d = await actualizarCliente(sesion.api(), c.uid, cambios);
      alCambiar(d);
      setNombre(d.nombre ?? "");
      setCorreo(d.correo);
      setAviso({
        tipo: "ok",
        texto: cambios.correo
          ? `Correo actualizado. El vínculo se recalculó (${d.vinculo === "vinculado" ? d.marcas.map((m) => NOMBRE_MARCA[m]).join(", ") : "sin marcas"}); la persona deberá verificar el nuevo correo al ingresar.`
          : "Cambios guardados.",
      });
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setOcupado(false);
      setConfirmandoCorreo(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section
        aria-labelledby="titulo-cliente"
        className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6 lg:col-span-2"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              id="titulo-cliente"
              className="text-2xl font-extrabold tracking-tight"
            >
              {c.nombre || "Sin nombre"}
            </h1>
            <p className="break-all text-muted-foreground">{c.correo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EtiquetaVinculo c={c} />
            <EtiquetaEstado activo={c.activo} />
            {c.verificacionPendiente && (
              <Badge variant="secondary">
                Verificación de correo pendiente
              </Badge>
            )}
          </div>
        </div>
        {aviso && (
          <Alert
            variant={aviso.tipo === "error" ? "destructive" : "default"}
            role={aviso.tipo === "error" ? "alert" : "status"}
          >
            <AlertDescription>{aviso.texto}</AlertDescription>
          </Alert>
        )}
      </section>

      <Tarjeta titulo="Datos de la cuenta">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (correoCambia) setConfirmandoCorreo(true);
            else void guardar({ nombre: nombre.trim() });
          }}
        >
          <Campo
            id="c-nombre"
            etiqueta="Nombre"
            value={nombre}
            maxLength={80}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Campo
            id="c-correo"
            etiqueta="Correo electrónico"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            ayuda="Al cambiarlo, el vínculo con las marcas se recalcula sólo con el correo nuevo y la persona debe verificarlo."
          />
          <Button
            type="submit"
            className="w-fit"
            disabled={
              ocupado ||
              (!correoCambia && !nombreCambia) ||
              nombre.trim().length < 2
            }
          >
            <UserRound aria-hidden="true" /> Guardar cambios
          </Button>
        </form>
        <label className="flex items-center gap-2 border-t pt-4 text-sm font-medium">
          <Switch
            checked={c.activo}
            disabled={ocupado}
            onCheckedChange={(activo: boolean) => guardar({ activo })}
            aria-label={c.activo ? "Desactivar cliente" : "Activar cliente"}
          />
          {c.activo
            ? "Cuenta activa: puede ingresar, acumular y canjear."
            : "Cuenta desactivada: no puede ingresar ni recibir puntos."}
        </label>
      </Tarjeta>

      <Tarjeta
        titulo="Puntos por marca"
        descripcion="Cada marca conserva su saldo, sus movimientos y sus reglas por separado."
      >
        <ul className="divide-y" aria-label="Saldos por marca">
          {c.saldos.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">
              Sin marcas vinculadas ni saldos.
            </li>
          )}
          {c.saldos.map((s) => (
            <li
              key={s.marca}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="flex items-center gap-2">
                <Layers
                  aria-hidden="true"
                  className="size-4 text-muted-foreground"
                />
                <span className="font-semibold">{NOMBRE_MARCA[s.marca]}</span>
                {!s.vinculada && (
                  <Badge variant="secondary">
                    Sin vínculo · saldo conservado
                  </Badge>
                )}
                {importadaEn(s.marca) && (
                  <span className="text-xs text-muted-foreground">
                    {importadaEn(s.marca)}
                  </span>
                )}
              </span>
              <span className="font-bold">
                {formatoPuntos(s.disponible)} pts
              </span>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Historial de cambios" className="lg:col-span-2">
        {c.historial.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin eventos registrados.
          </p>
        ) : (
          <ol aria-label="Historial de cambios" className="divide-y">
            {c.historial.map((e, i) => (
              <li key={i} className="flex gap-3 py-3">
                <History
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">
                    {NOMBRE_ACCION[e.accion] ?? e.accion}
                  </p>
                  <p className="text-muted-foreground">
                    {formatoFechaHora(e.en)} · {e.actorNombre ?? e.actor}
                    {detalleAccion(e.datos)
                      ? ` · ${detalleAccion(e.datos)}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Tarjeta>

      <section
        aria-labelledby="titulo-eliminar"
        className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-card p-5 sm:p-6 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h2 id="titulo-eliminar" className="font-bold">
            Eliminar cliente
          </h2>
          <p className="text-sm text-muted-foreground">
            Borra el acceso y los datos personales. Los movimientos, canjes y la
            auditoría se conservan sin nombre ni correo. No se puede deshacer.
          </p>
        </div>
        <Button
          variant="destructive"
          className="w-fit"
          onClick={() => setEliminando(true)}
        >
          <Trash2 aria-hidden="true" /> Eliminar cliente
        </Button>
      </section>

      <AlertDialog
        open={confirmandoCorreo}
        onOpenChange={(abierto: boolean) =>
          !abierto && !ocupado && setConfirmandoCorreo(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar el correo del cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrarán sus sesiones, deberá ingresar con{" "}
              <span className="break-all">{correo.trim().toLowerCase()}</span> y
              verificarlo. Sus marcas se recalcularán sólo con el correo nuevo;
              los saldos de marcas que dejen de coincidir se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <Button
              disabled={ocupado}
              onClick={() =>
                guardar({
                  correo: correo.trim(),
                  ...(nombreCambia ? { nombre: nombre.trim() } : {}),
                })
              }
            >
              Cambiar correo
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={eliminando}
        onOpenChange={(abierto: boolean) =>
          !abierto && !ocupado && setEliminando(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              {c.nombre || c.correo} perderá el acceso y sus datos personales se
              borrarán. Su correo quedará libre para un registro nuevo. Esta
              acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={ocupado}
              onClick={async () => {
                setOcupado(true);
                try {
                  await eliminarCliente(sesion.api(), c.uid);
                  router.replace("/admin/clientes");
                } catch (e) {
                  setAviso({ tipo: "error", texto: mensajeError(e) });
                  setEliminando(false);
                } finally {
                  setOcupado(false);
                }
              }}
            >
              Eliminar definitivamente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

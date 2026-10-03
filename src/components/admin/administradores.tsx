"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Campo } from "@/components/acceso/campo";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  actualizarAdministrador,
  crearAdministrador,
  eliminarAdministrador,
  getAdministradores,
  type Administrador,
} from "@/lib/api/identidades";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha } from "@/lib/formato";
import { useCarga } from "@/lib/use-carga";

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

const nombreDe = (a: Administrador) => a.nombre || a.correo;

/**
 * UI-06 Administradores (A03, SRC-02 pp. 2–3): alta por invitación (DEC-03),
 * edición del nombre, activación y eliminación confirmada. El backend protege
 * al último administrador activo y a la propia cuenta.
 */
export function Administradores() {
  const sesion = useSesion();
  const me = usePerfil();
  const { carga, recargar } = useCarga(
    () => getAdministradores(sesion.api()),
    [me.uid],
  );
  const [aviso, setAviso] = useState<Aviso>(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Administrador | null>(null);
  const [eliminando, setEliminando] = useState<Administrador | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const ejecutar = async (uid: string, fn: () => Promise<string>) => {
    setOcupado(uid);
    setAviso(null);
    try {
      setAviso({ tipo: "ok", texto: await fn() });
      recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setOcupado(null);
    }
  };

  const invitar = (correo: string) =>
    sesion.enviarCorreoContrasena(correo, "/admin/ingresar");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Administradores"
          descripcion="Sólo un administrador puede crear otras cuentas administrativas. Los clientes nunca se convierten en administradores."
        />
        <Button className="h-10" onClick={() => setCreando(true)}>
          <Plus aria-hidden="true" /> Nuevo administrador
        </Button>
      </div>
      {aviso && (
        <Alert
          variant={aviso.tipo === "error" ? "destructive" : "default"}
          role={aviso.tipo === "error" ? "alert" : "status"}
        >
          <AlertDescription>{aviso.texto}</AlertDescription>
        </Alert>
      )}
      <Tarjeta>
        <EstadoCarga
          carga={carga}
          recargar={recargar}
          etiqueta="los administradores"
        >
          {({ items }) => (
            <>
              <ul aria-label="Administradores" className="divide-y">
                {items.map((a) => {
                  const yo = a.uid === me.uid;
                  return (
                    <li
                      key={a.uid}
                      className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-semibold">
                          {a.nombre || "Sin nombre"}
                          {yo && <Badge variant="secondary">Tú</Badge>}
                        </p>
                        <p className="text-sm break-all text-muted-foreground">
                          {a.correo}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 lg:gap-6">
                        <span className="text-sm text-muted-foreground lg:w-40">
                          {a.invitacionPendiente
                            ? "Invitación pendiente"
                            : `Último acceso: ${formatoFecha(a.ultimoAcceso!)}`}
                        </span>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={a.activo}
                            disabled={yo || ocupado === a.uid}
                            onCheckedChange={(activo: boolean) =>
                              ejecutar(a.uid, async () => {
                                await actualizarAdministrador(
                                  sesion.api(),
                                  a.uid,
                                  { activo },
                                );
                                return `${nombreDe(a)} quedó ${activo ? "activo" : "inactivo"}.`;
                              })
                            }
                            aria-label={`${a.activo ? "Desactivar" : "Activar"} a ${nombreDe(a)}`}
                          />
                          <span className="w-16">
                            {a.activo ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="flex gap-1">
                          {a.invitacionPendiente && (
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={ocupado === a.uid}
                              aria-label={`Reenviar invitación a ${nombreDe(a)}`}
                              onClick={() =>
                                ejecutar(a.uid, async () => {
                                  await invitar(a.correo);
                                  return `Invitación reenviada a ${a.correo}.`;
                                })
                              }
                            >
                              <MailPlus aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Editar a ${nombreDe(a)}`}
                            onClick={() => setEditando(a)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            disabled={yo}
                            aria-label={`Eliminar a ${nombreDe(a)}`}
                            onClick={() => setEliminando(a)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:justify-between">
                <span>
                  {items.length} {items.length === 1 ? "cuenta" : "cuentas"} ·{" "}
                  {items.filter((a) => a.activo).length} activas
                </span>
                <span>
                  Debe existir al menos un administrador activo. Las acciones se
                  registran en la auditoría.
                </span>
              </p>
            </>
          )}
        </EstadoCarga>
      </Tarjeta>

      <Dialog open={creando} onOpenChange={setCreando}>
        <DialogContent className="sm:max-w-md">
          {creando && (
            <FormularioAlta
              alTerminar={(a) => {
                setCreando(false);
                setAviso(a);
                recargar();
              }}
              invitar={invitar}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto: boolean) => !abierto && setEditando(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editando && (
            <FormularioNombre
              admin={editando}
              alGuardar={(texto) => {
                setEditando(null);
                setAviso({ tipo: "ok", texto });
                recargar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={eliminando !== null}
        onOpenChange={(abierto: boolean) =>
          !abierto && ocupado === null && setEliminando(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              {eliminando && nombreDe(eliminando)} perderá el acceso de forma
              definitiva. Su historial de acciones se conserva en la auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ocupado !== null}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={ocupado !== null}
              onClick={async () => {
                const a = eliminando!;
                await ejecutar(a.uid, async () => {
                  await eliminarAdministrador(sesion.api(), a.uid);
                  return `${nombreDe(a)} fue eliminado.`;
                });
                setEliminando(null);
              }}
            >
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const esquemaAlta = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre.").max(80),
  apellido: z.string().trim().min(2, "Ingresa el apellido.").max(80),
  correo: z.email("Ingresa un correo válido.").trim(),
});

function FormularioAlta({
  alTerminar,
  invitar,
}: {
  alTerminar: (aviso: Aviso) => void;
  invitar: (correo: string) => Promise<void>;
}) {
  const sesion = useSesion();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof esquemaAlta>>({
    resolver: zodResolver(esquemaAlta),
  });

  const enviar = handleSubmit(async (datos) => {
    setError(null);
    let creado;
    try {
      creado = await crearAdministrador(sesion.api(), datos);
    } catch (e) {
      setError(mensajeError(e));
      return;
    }
    try {
      await invitar(creado.correo);
      alTerminar({
        tipo: "ok",
        texto: `Cuenta creada. Enviamos a ${creado.correo} el correo para definir su contraseña.`,
      });
    } catch (e) {
      alTerminar({
        tipo: "error",
        texto: `La cuenta se creó, pero no se pudo enviar la invitación (${mensajeError(e)}). Usa «Reenviar invitación».`,
      });
    }
  });

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Nuevo administrador</DialogTitle>
        <DialogDescription>
          Recibirá un correo para definir su contraseña. Nadie más la conoce.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          id="a-nombre"
          etiqueta="Nombre"
          autoComplete="off"
          error={errors.nombre?.message}
          {...register("nombre")}
        />
        <Campo
          id="a-apellido"
          etiqueta="Apellido"
          autoComplete="off"
          error={errors.apellido?.message}
          {...register("apellido")}
        />
      </div>
      <Campo
        id="a-correo"
        etiqueta="Correo electrónico"
        type="email"
        autoComplete="off"
        error={errors.correo?.message}
        {...register("correo")}
      />
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando…" : "Crear e invitar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function FormularioNombre({
  admin,
  alGuardar,
}: {
  admin: Administrador;
  alGuardar: (texto: string) => void;
}) {
  const sesion = useSesion();
  const [nombre, setNombre] = useState(admin.nombre ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError(null);
        try {
          await actualizarAdministrador(sesion.api(), admin.uid, {
            nombre: nombre.trim(),
          });
          alGuardar("Nombre actualizado.");
        } catch (err) {
          setError(mensajeError(err));
        } finally {
          setGuardando(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Editar administrador</DialogTitle>
        <DialogDescription>
          El correo de acceso no se cambia desde aquí.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Campo
        id="e-nombre"
        etiqueta="Nombre completo"
        value={nombre}
        maxLength={80}
        onChange={(e) => setNombre(e.target.value)}
      />
      <p className="text-sm break-all text-muted-foreground">{admin.correo}</p>
      <DialogFooter>
        <Button type="submit" disabled={guardando || nombre.trim().length < 2}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

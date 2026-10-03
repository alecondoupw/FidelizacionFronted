"use client";

import { Eye, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Campo } from "@/components/acceso/campo";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { Selector } from "@/components/comun/selector";
import {
  IlustracionPublicacion,
  NOMBRE_CATEGORIA_CONTENIDO,
  TarjetaPublicacion,
} from "@/components/contenido/publicacion-visual";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  activarContenido,
  actualizarContenido,
  crearContenido,
  eliminarContenido,
  getContenidosAdmin,
  type CategoriaContenido,
  type DatosPublicacion,
  type PublicacionAdmin,
} from "@/lib/api/contenidos";
import type { Marca } from "@/lib/api/contract";
import { ApiError } from "@/lib/api/client";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { textoRango } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/comun/chip";
import { COLOR_MARCA } from "./reportes-comun";

const MARCAS: Marca[] = ["zontes", "kiden", "niu"];
const ESTADO = {
  programada: "Programada",
  publicada: "Publicada",
  finalizada: "Finalizada",
} as const;
type FiltroActiva = "todas" | "activas" | "inactivas";
type FiltroEstado = "todos" | keyof typeof ESTADO;

const ventana = (
  p: Pick<PublicacionAdmin, "publicarDesde" | "publicarHasta">,
) =>
  p.publicarDesde && p.publicarHasta
    ? textoRango(p.publicarDesde, p.publicarHasta)
    : p.publicarDesde
      ? `Desde ${textoRango(p.publicarDesde, p.publicarDesde)}`
      : p.publicarHasta
        ? `Hasta ${textoRango(p.publicarHasta, p.publicarHasta)}`
        : "Sin ventana de publicación";

/**
 * UI-12 Contenido por marca (A09, SRC-02 p. 7, DEC-10): cada marca mantiene
 * su contenido; sólo lo activo y vigente llega a sus clientes.
 */
export function ContenidoAdmin() {
  const sesion = useSesion();
  const me = usePerfil();
  const [marca, setMarca] = useState<Marca>("zontes");
  const [texto, setTexto] = useState("");
  const [activa, setActiva] = useState<FiltroActiva>("todas");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [editando, setEditando] = useState<PublicacionAdmin | "nueva" | null>(
    null,
  );
  const [viendo, setViendo] = useState<PublicacionAdmin | null>(null);
  const [eliminando, setEliminando] = useState<PublicacionAdmin | null>(null);
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { carga, recargar } = useCarga(
    () => getContenidosAdmin(sesion.api()),
    [me.uid],
  );

  const ejecutar = async (id: string, fn: () => Promise<string>) => {
    setOcupado(id);
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Contenido por marca"
          descripcion="Cada marca mantiene su contenido por separado. Sólo el contenido activo y vigente se muestra a sus clientes."
        />
        <Button className="h-10" onClick={() => setEditando("nueva")}>
          <Plus aria-hidden="true" /> Nuevo contenido
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
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="el contenido"
        alto="h-80"
      >
        {({ items }) => {
          const q = texto.trim().toLowerCase();
          const visibles = items
            .filter((p) => p.marca === marca)
            .filter((p) => !q || p.titulo.toLowerCase().includes(q))
            .filter(
              (p) => activa === "todas" || p.activa === (activa === "activas"),
            )
            .filter((p) => estado === "todos" || p.estado === estado);
          return (
            <>
              <div
                role="group"
                aria-label="Marca"
                className="grid gap-2 sm:grid-cols-3"
              >
                {MARCAS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={marca === m}
                    onClick={() => setMarca(m)}
                    className={cn(
                      "flex items-center justify-between rounded-xl bg-card px-4 py-3 text-left font-semibold ring-1 ring-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      marca === m && "bg-secondary ring-2 ring-primary",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: COLOR_MARCA[m] }}
                      />
                      {NOMBRE_MARCA[m]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {items.filter((p) => p.marca === m).length}
                      <span className="sr-only"> publicaciones</span>
                    </span>
                  </button>
                ))}
              </div>
              <Tarjeta>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative lg:w-72">
                    <Label htmlFor="buscar-titulo" className="sr-only">
                      Buscar por título
                    </Label>
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="buscar-titulo"
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      placeholder="Buscar por título"
                      className="h-10 pl-9"
                    />
                  </div>
                  <div
                    role="group"
                    aria-label="Activación"
                    className="flex flex-wrap gap-2"
                  >
                    {(
                      [
                        ["todas", "Todos"],
                        ["activas", "Activos"],
                        ["inactivas", "Inactivos"],
                      ] as const
                    ).map(([v, t]) => (
                      <Chip
                        key={v}
                        activo={activa === v}
                        onClick={() => setActiva(v)}
                      >
                        {t}
                      </Chip>
                    ))}
                  </div>
                  <div
                    role="group"
                    aria-label="Publicación"
                    className="flex flex-wrap gap-2"
                  >
                    {(
                      [
                        ["todos", "Cualquier fecha"],
                        ["publicada", "Publicados"],
                        ["programada", "Programados"],
                        ["finalizada", "Finalizados"],
                      ] as const
                    ).map(([v, t]) => (
                      <Chip
                        key={v}
                        activo={estado === v}
                        onClick={() => setEstado(v)}
                      >
                        {t}
                      </Chip>
                    ))}
                  </div>
                </div>
              </Tarjeta>
              {visibles.length === 0 ? (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {items.some((p) => p.marca === marca)
                    ? "Ninguna publicación coincide con los filtros."
                    : `${NOMBRE_MARCA[marca]} todavía no tiene contenido. Crea la primera publicación.`}
                </p>
              ) : (
                <ul
                  aria-label={`Contenido de ${NOMBRE_MARCA[marca]}`}
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {visibles.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        "flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border",
                        !p.visible && "opacity-80",
                      )}
                    >
                      <IlustracionPublicacion
                        marca={p.marca}
                        categoria={p.categoria}
                        className="h-24"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          className={
                            p.estado === "publicada"
                              ? "bg-exito-suave text-exito"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {ESTADO[p.estado]}
                        </Badge>
                        <Badge variant="secondary">
                          {p.activa ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline">
                          {NOMBRE_CATEGORIA_CONTENIDO[p.categoria]}
                        </Badge>
                        {p.destacada && (
                          <Badge variant="outline">
                            <Star aria-hidden="true" /> Destacada
                          </Badge>
                        )}
                      </div>
                      <h2 className="font-bold">{p.titulo}</h2>
                      {p.texto && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {p.texto}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {ventana(p)}
                      </p>
                      <p className="text-xs font-medium">
                        {p.visible
                          ? "Visible hoy para clientes"
                          : "No visible para clientes"}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                        <Switch
                          checked={p.activa}
                          disabled={ocupado === p.id}
                          onCheckedChange={(v: boolean) =>
                            ejecutar(p.id, async () => {
                              await activarContenido(sesion.api(), p.id, v);
                              return `«${p.titulo}» quedó ${v ? "activa" : "inactiva"}.`;
                            })
                          }
                          aria-label={`${p.activa ? "Desactivar" : "Activar"} ${p.titulo}`}
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Vista previa de ${p.titulo}`}
                            onClick={() => setViendo(p)}
                          >
                            <Eye aria-hidden="true" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Editar ${p.titulo}`}
                            onClick={() => setEditando(p)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label={`Eliminar ${p.titulo}`}
                            onClick={() => setEliminando(p)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          );
        }}
      </EstadoCarga>

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto: boolean) => !abierto && setEditando(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          {editando !== null && (
            <Editor
              actual={editando === "nueva" ? null : editando}
              marcaInicial={marca}
              alGuardar={(t) => {
                setEditando(null);
                setAviso({ tipo: "ok", texto: t });
                recargar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={viendo !== null}
        onOpenChange={(abierto: boolean) => !abierto && setViendo(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
            <DialogDescription>
              Así la ve un cliente vinculado a{" "}
              {viendo ? NOMBRE_MARCA[viendo.marca] : ""}
              {viendo && !viendo.visible
                ? ", cuando esté activa y dentro de su ventana"
                : ""}
              .
            </DialogDescription>
          </DialogHeader>
          {viendo && <TarjetaPublicacion p={viendo} />}
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
            <AlertDialogTitle>¿Eliminar esta publicación?</AlertDialogTitle>
            <AlertDialogDescription>
              «{eliminando?.titulo}» dejará de existir para todos. Si sólo
              quieres ocultarla, desactívala. Queda registrada en la auditoría.
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
                const p = eliminando!;
                await ejecutar(p.id, async () => {
                  await eliminarContenido(sesion.api(), p.id);
                  return `«${p.titulo}» fue eliminada.`;
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

const OPC_CATEGORIA = (
  Object.keys(NOMBRE_CATEGORIA_CONTENIDO) as CategoriaContenido[]
).map((c) => ({
  valor: c,
  texto: NOMBRE_CATEGORIA_CONTENIDO[c],
}));
const OPC_MARCA = MARCAS.map((m) => ({ valor: m, texto: NOMBRE_MARCA[m] }));

function Editor({
  actual,
  marcaInicial,
  alGuardar,
}: {
  actual: PublicacionAdmin | null;
  marcaInicial: Marca;
  alGuardar: (texto: string) => void;
}) {
  const sesion = useSesion();
  const [d, setD] = useState<DatosPublicacion>(
    actual
      ? {
          marca: actual.marca,
          categoria: actual.categoria,
          titulo: actual.titulo,
          texto: actual.texto,
          enlace: actual.enlace,
          destacada: actual.destacada,
          activa: actual.activa,
          publicarDesde: actual.publicarDesde,
          publicarHasta: actual.publicarHasta,
        }
      : {
          marca: marcaInicial,
          categoria: "noticia",
          titulo: "",
          texto: "",
          enlace: null,
          destacada: false,
          activa: false,
          publicarDesde: null,
          publicarHasta: null,
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (c: Partial<DatosPublicacion>) =>
    setD((x) => ({ ...x, ...c }));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setGuardando(true);
        setError(null);
        try {
          const cuerpo = {
            ...d,
            titulo: d.titulo.trim(),
            texto: d.texto.trim(),
            enlace: d.enlace?.trim() || null,
          };
          if (actual)
            await actualizarContenido(sesion.api(), actual.id, cuerpo);
          else await crearContenido(sesion.api(), cuerpo);
          alGuardar(
            actual ? "Publicación actualizada." : "Publicación creada.",
          );
        } catch (err) {
          const detalle =
            err instanceof ApiError && Array.isArray(err.details)
              ? (err.details as { campo: string; mensaje: string }[])
                  .map((x) => `${x.campo}: ${x.mensaje}`)
                  .join(" · ")
              : "";
          setError(`${mensajeError(err)}${detalle ? ` (${detalle})` : ""}`);
        } finally {
          setGuardando(false);
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {actual ? "Editar publicación" : "Nueva publicación"}
        </DialogTitle>
        <DialogDescription>
          Sin imágenes por ahora: la tarjeta usa el color de la marca y el icono
          de la categoría.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Selector
              id="c-marca"
              etiqueta="Marca"
              opciones={OPC_MARCA}
              value={d.marca}
              onChange={(e) => cambiar({ marca: e.target.value as Marca })}
            />
            <Selector
              id="c-categoria"
              etiqueta="Categoría"
              opciones={OPC_CATEGORIA}
              value={d.categoria}
              onChange={(e) =>
                cambiar({ categoria: e.target.value as CategoriaContenido })
              }
            />
          </div>
          <Campo
            id="c-titulo"
            etiqueta="Título"
            value={d.titulo}
            maxLength={90}
            onChange={(e) => cambiar({ titulo: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-texto">Texto</Label>
            <Textarea
              id="c-texto"
              rows={3}
              maxLength={600}
              value={d.texto}
              onChange={(e) => cambiar({ texto: e.target.value })}
            />
          </div>
          <Campo
            id="c-enlace"
            etiqueta="Enlace (opcional)"
            type="url"
            placeholder="https://"
            value={d.enlace ?? ""}
            onChange={(e) => cambiar({ enlace: e.target.value || null })}
            ayuda="Sólo enlaces https; se abre en otra pestaña."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="c-desde"
              etiqueta="Publicar desde"
              type="date"
              value={d.publicarDesde ?? ""}
              onChange={(e) =>
                cambiar({ publicarDesde: e.target.value || null })
              }
              ayuda="Vacío: desde ya."
            />
            <Campo
              id="c-hasta"
              etiqueta="Publicar hasta"
              type="date"
              value={d.publicarHasta ?? ""}
              onChange={(e) =>
                cambiar({ publicarHasta: e.target.value || null })
              }
              ayuda="Vacío: sin fin. Hora de Bolivia."
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              checked={d.destacada}
              onCheckedChange={(v: boolean) => cambiar({ destacada: v })}
              aria-label="Destacada en el Inicio de los clientes"
            />
            Destacada en el Inicio de los clientes
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              checked={d.activa}
              onCheckedChange={(v: boolean) => cambiar({ activa: v })}
              aria-label="Activa"
            />
            {d.activa
              ? "Activa: visible dentro de su ventana"
              : "Inactiva: oculta para clientes"}
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Vista previa
          </p>
          <TarjetaPublicacion
            p={{
              ...d,
              titulo: d.titulo || "Título de la publicación",
              enlace:
                d.enlace && d.enlace.startsWith("https://") ? d.enlace : null,
            }}
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={guardando || d.titulo.trim().length < 3}
        >
          {guardando
            ? "Guardando…"
            : actual
              ? "Guardar cambios"
              : "Crear publicación"}
        </Button>
      </DialogFooter>
    </form>
  );
}

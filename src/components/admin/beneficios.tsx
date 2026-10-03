"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Campo } from "@/components/acceso/campo";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { Selector } from "@/components/comun/selector";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  actualizarBeneficio,
  crearBeneficio,
  getBeneficiosAdmin,
  type BeneficioAdmin,
  type Categoria,
  type DatosBeneficio,
} from "@/lib/api/canjes";
import type { Marca } from "@/lib/api/contract";
import { ApiError } from "@/lib/api/client";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoPuntos, NOMBRE_CATEGORIA } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";

const OPC_MARCA = (Object.keys(NOMBRE_MARCA) as Marca[]).map((m) => ({
  valor: m,
  texto: NOMBRE_MARCA[m],
}));
const OPC_CATEGORIA = (Object.keys(NOMBRE_CATEGORIA) as Categoria[]).map(
  (c) => ({ valor: c, texto: NOMBRE_CATEGORIA[c] }),
);

/** id de variante legible y estable: minúsculas, sin tildes, con guiones. */
export function idVariante(nombre: string, usados: Set<string>): string {
  const base =
    nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28) || "opcion";
  let id = base;
  for (let i = 2; usados.has(id); i++) id = `${base}-${i}`;
  usados.add(id);
  return id;
}

const stockTexto = (b: BeneficioAdmin) =>
  b.variantes.some((v) => v.stock === null)
    ? "Sin límite"
    : `${b.variantes.reduce((s, v) => s + (v.stock ?? 0), 0)} en stock`;

/**
 * UI-25 Beneficios (propuesta, DEC-07): mantenimiento del catálogo por marca.
 * No hay mockup; sigue la línea visual de A05. El backend valida todo.
 */
export function BeneficiosAdmin() {
  const sesion = useSesion();
  const { carga, recargar } = useCarga(
    () => getBeneficiosAdmin(sesion.api()),
    [],
  );
  const [editando, setEditando] = useState<BeneficioAdmin | "nuevo" | null>(
    null,
  );
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Beneficios"
          descripcion="Catálogo por marca: puntos, stock por opción, vigencia del cupón y fecha de disponibilidad."
        />
        <Button className="h-10" onClick={() => setEditando("nuevo")}>
          <Plus aria-hidden="true" /> Nuevo beneficio
        </Button>
      </div>
      {aviso && (
        <Alert role="status">
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
      <Tarjeta>
        <EstadoCarga
          carga={carga}
          recargar={recargar}
          etiqueta="los beneficios"
        >
          {({ items }) =>
            items.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Aún no hay beneficios. Crea uno o carga el catálogo inicial con
                el comando del backend.
              </p>
            ) : (
              <ul aria-label="Beneficios" className="divide-y">
                {[...items]
                  .sort(
                    (a, b) =>
                      a.marca.localeCompare(b.marca) ||
                      a.nombre.localeCompare(b.nombre),
                  )
                  .map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{b.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {NOMBRE_CATEGORIA[b.categoria]} · {b.variantes.length}{" "}
                          {b.variantes.length === 1 ? "opción" : "opciones"} ·{" "}
                          {stockTexto(b)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="secondary">
                          {NOMBRE_MARCA[b.marca]}
                        </Badge>
                        <span className="w-24 font-bold sm:text-right">
                          {formatoPuntos(b.puntos)} pts
                        </span>
                        <Badge
                          className={
                            b.activo
                              ? "bg-exito-suave text-exito"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {b.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Editar ${b.nombre}`}
                          onClick={() => setEditando(b)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
            )
          }
        </EstadoCarga>
      </Tarjeta>
      <Dialog
        open={editando !== null}
        onOpenChange={(abierto: boolean) => !abierto && setEditando(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {editando !== null && (
            <FormularioBeneficio
              actual={editando === "nuevo" ? null : editando}
              alGuardar={(texto) => {
                setEditando(null);
                setAviso(texto);
                recargar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type FilaVariante = {
  id: string | null;
  nombre: string;
  stock: string;
  sinLimite: boolean;
};

function FormularioBeneficio({
  actual,
  alGuardar,
}: {
  actual: BeneficioAdmin | null;
  alGuardar: (texto: string) => void;
}) {
  const sesion = useSesion();
  const [marca, setMarca] = useState<Marca>(actual?.marca ?? "zontes");
  const [nombre, setNombre] = useState(actual?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(actual?.descripcion ?? "");
  const [categoria, setCategoria] = useState<Categoria>(
    actual?.categoria ?? "accesorios",
  );
  const [puntos, setPuntos] = useState(actual ? String(actual.puntos) : "");
  const [vigencia, setVigencia] = useState(
    actual ? String(actual.vigenciaCuponDias) : "30",
  );
  const [desde, setDesde] = useState(
    actual?.disponibleDesde ? actual.disponibleDesde.slice(0, 10) : "",
  );
  const [activo, setActivo] = useState(actual?.activo ?? true);
  const [caracteristicas, setCaracteristicas] = useState(
    (actual?.caracteristicas ?? []).join("\n"),
  );
  const [variantes, setVariantes] = useState<FilaVariante[]>(
    actual?.variantes.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      stock: v.stock === null ? "" : String(v.stock),
      sinLimite: v.stock === null,
    })) ?? [{ id: null, nombre: "Única", stock: "10", sinLimite: false }],
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiarVariante = (i: number, cambio: Partial<FilaVariante>) =>
    setVariantes((vs) => vs.map((v, j) => (j === i ? { ...v, ...cambio } : v)));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const usados = new Set(variantes.flatMap((v) => (v.id ? [v.id] : [])));
    const datos: DatosBeneficio = {
      marca,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoria,
      puntos: Number(puntos),
      activo,
      // Fecha local de Bolivia (UTC−4): inicio del día.
      disponibleDesde: desde ? `${desde}T04:00:00.000Z` : null,
      vigenciaCuponDias: Number(vigencia),
      caracteristicas: caracteristicas
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
      variantes: variantes.map((v) => ({
        id: v.id ?? idVariante(v.nombre, usados),
        nombre: v.nombre.trim(),
        stock: v.sinLimite ? null : Number(v.stock),
      })),
    };
    setGuardando(true);
    try {
      if (actual) await actualizarBeneficio(sesion.api(), actual.id, datos);
      else await crearBeneficio(sesion.api(), datos);
      alGuardar(
        actual
          ? "Beneficio actualizado. Los canjes ya emitidos conservan sus datos."
          : "Beneficio creado.",
      );
    } catch (err) {
      const detalle =
        err instanceof ApiError && Array.isArray(err.details)
          ? (err.details as { campo: string; mensaje: string }[])
              .map((d) => `${d.campo}: ${d.mensaje}`)
              .join(" · ")
          : "";
      setError(`${mensajeError(err)}${detalle ? ` (${detalle})` : ""}`);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form noValidate onSubmit={guardar} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {actual ? "Editar beneficio" : "Nuevo beneficio"}
        </DialogTitle>
        <DialogDescription>
          El stock se descuenta al canjear y vuelve si un canje se anula.
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector
          id="b-marca"
          etiqueta="Marca"
          opciones={OPC_MARCA}
          value={marca}
          onChange={(e) => setMarca(e.target.value as Marca)}
        />
        <Selector
          id="b-categoria"
          etiqueta="Categoría"
          opciones={OPC_CATEGORIA}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as Categoria)}
        />
      </div>
      <Campo
        id="b-nombre"
        etiqueta="Nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        maxLength={80}
      />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="b-descripcion">Descripción</Label>
        <Textarea
          id="b-descripcion"
          rows={2}
          maxLength={500}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          id="b-puntos"
          etiqueta="Puntos"
          type="number"
          inputMode="numeric"
          min={1}
          value={puntos}
          onChange={(e) => setPuntos(e.target.value)}
        />
        <Campo
          id="b-vigencia"
          etiqueta="Vigencia del cupón (días)"
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={vigencia}
          onChange={(e) => setVigencia(e.target.value)}
        />
        <Campo
          id="b-desde"
          etiqueta="Disponible desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          ayuda="Vacío: disponible ya."
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="b-caracteristicas">
          Características (una por línea)
        </Label>
        <Textarea
          id="b-caracteristicas"
          rows={2}
          value={caracteristicas}
          onChange={(e) => setCaracteristicas(e.target.value)}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">Opciones y stock</legend>
        {variantes.map((v, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_6rem_auto_auto] items-end gap-2"
          >
            <Campo
              id={`v-nombre-${i}`}
              etiqueta={`Opción ${i + 1}`}
              value={v.nombre}
              onChange={(e) => cambiarVariante(i, { nombre: e.target.value })}
              maxLength={40}
            />
            <Campo
              id={`v-stock-${i}`}
              etiqueta="Stock"
              type="number"
              min={0}
              value={v.sinLimite ? "" : v.stock}
              disabled={v.sinLimite}
              onChange={(e) => cambiarVariante(i, { stock: e.target.value })}
            />
            <label className="flex h-10 items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={v.sinLimite}
                onChange={(e) =>
                  cambiarVariante(i, { sinLimite: e.target.checked })
                }
              />
              Sin límite
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar opción ${i + 1}`}
              disabled={variantes.length === 1}
              onClick={() => setVariantes((vs) => vs.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={variantes.length >= 20}
          onClick={() =>
            setVariantes((vs) => [
              ...vs,
              { id: null, nombre: "", stock: "0", sinLimite: false },
            ])
          }
        >
          <Plus aria-hidden="true" /> Agregar opción
        </Button>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch
          checked={activo}
          onCheckedChange={(v: boolean) => setActivo(v)}
          aria-label="Beneficio activo"
        />
        {activo
          ? "Activo: visible en el catálogo"
          : "Inactivo: oculto para clientes"}
      </label>
      <DialogFooter>
        <Button type="submit" disabled={guardando}>
          {guardando
            ? "Guardando…"
            : actual
              ? "Guardar cambios"
              : "Crear beneficio"}
        </Button>
      </DialogFooter>
    </form>
  );
}

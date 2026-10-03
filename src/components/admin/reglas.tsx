"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Campo } from "@/components/acceso/campo";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { Selector } from "@/components/comun/selector";
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
  actualizarRegla,
  crearRegla,
  eliminarRegla,
  eventoSchema,
  getReglas,
  type Evento,
  type Marca,
  type Regla,
} from "@/lib/api/puntos";
import { marcaSchema } from "@/lib/api/contract";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoFecha,
  formatoPuntos,
  NOMBRE_EVENTO,
  resumenRegla,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";

const OPC_EVENTO = (Object.keys(NOMBRE_EVENTO) as Evento[]).map((e) => ({
  valor: e,
  texto: NOMBRE_EVENTO[e],
}));
const OPC_MARCA = (Object.keys(NOMBRE_MARCA) as Marca[]).map((m) => ({
  valor: m,
  texto: NOMBRE_MARCA[m],
}));

/**
 * UI-04 Reglas de puntos (A05, SRC-02 pp. 3–5): evento + marca + puntos +
 * estado, sin campo de condición; resumen dinámico antes de guardar; los
 * cambios sólo afectan eventos futuros. El backend valida todo de nuevo.
 */
export function ReglasPuntos() {
  const sesion = useSesion();
  const { carga, recargar } = useCarga(() => getReglas(sesion.api()), []);
  const [filtro, setFiltro] = useState({ evento: "", marca: "", estado: "" });
  const [editando, setEditando] = useState<Regla | "nueva" | null>(null);
  const [eliminando, setEliminando] = useState<Regla | null>(null);
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const alternar = async (r: Regla, activa: boolean) => {
    setOcupado(r.id);
    setAviso(null);
    try {
      await actualizarRegla(sesion.api(), r.id, { activa });
      setAviso({
        tipo: "ok",
        texto: `Regla ${activa ? "activada" : "desactivada"}: ${NOMBRE_EVENTO[r.evento]} · ${NOMBRE_MARCA[r.marca]}.`,
      });
      recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setOcupado(null);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    const r = eliminando;
    setOcupado(r.id);
    try {
      await eliminarRegla(sesion.api(), r.id);
      setAviso({
        tipo: "ok",
        texto: `Regla eliminada: ${NOMBRE_EVENTO[r.evento]} · ${NOMBRE_MARCA[r.marca]}. Los puntos ya otorgados no cambian.`,
      });
      recargar();
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setOcupado(null);
      setEliminando(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <EncabezadoPagina
          titulo="Reglas de puntos"
          descripcion="Cada regla define evento, marca y puntos. Al registrar el evento para un cliente, los puntos se otorgan automáticamente."
        />
        <Button className="h-10" onClick={() => setEditando("nueva")}>
          <Plus aria-hidden="true" />
          Nueva regla
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
        <div
          role="group"
          aria-label="Filtros"
          className="grid gap-3 sm:grid-cols-3"
        >
          <Selector
            id="f-evento"
            etiqueta="Evento"
            value={filtro.evento}
            onChange={(e) => setFiltro({ ...filtro, evento: e.target.value })}
            opciones={[{ valor: "", texto: "Todos" }, ...OPC_EVENTO]}
          />
          <Selector
            id="f-marca"
            etiqueta="Marca"
            value={filtro.marca}
            onChange={(e) => setFiltro({ ...filtro, marca: e.target.value })}
            opciones={[{ valor: "", texto: "Todas" }, ...OPC_MARCA]}
          />
          <Selector
            id="f-estado"
            etiqueta="Estado"
            value={filtro.estado}
            onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}
            opciones={[
              { valor: "", texto: "Todos" },
              { valor: "true", texto: "Activas" },
              { valor: "false", texto: "Inactivas" },
            ]}
          />
        </div>

        <EstadoCarga carga={carga} recargar={recargar} etiqueta="las reglas">
          {({ items }) => {
            const visibles = items
              .filter(
                (r) =>
                  (!filtro.evento || r.evento === filtro.evento) &&
                  (!filtro.marca || r.marca === filtro.marca) &&
                  (!filtro.estado || String(r.activa) === filtro.estado),
              )
              .sort((a, b) =>
                a.evento + a.marca < b.evento + b.marca ? -1 : 1,
              );
            if (visibles.length === 0) {
              return (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  {items.length === 0
                    ? "Aún no hay reglas. Crea la primera con «Nueva regla»."
                    : "Ninguna regla coincide con los filtros."}
                </p>
              );
            }
            return (
              <ul aria-label="Reglas de puntos" className="divide-y">
                {visibles.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{NOMBRE_EVENTO[r.evento]}</p>
                      <p className="text-xs text-muted-foreground">
                        Modificada el {formatoFecha(r.actualizadoEn)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                      <Badge variant="secondary">{NOMBRE_MARCA[r.marca]}</Badge>
                      <span className="w-24 font-bold sm:text-right">
                        +{formatoPuntos(r.puntos)} pts
                      </span>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={r.activa}
                          disabled={ocupado === r.id}
                          onCheckedChange={(v: boolean) => alternar(r, v)}
                          aria-label={`${r.activa ? "Desactivar" : "Activar"} regla ${NOMBRE_EVENTO[r.evento]} de ${NOMBRE_MARCA[r.marca]}`}
                        />
                        <span className="w-16">
                          {r.activa ? "Activa" : "Inactiva"}
                        </span>
                      </label>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Editar regla ${NOMBRE_EVENTO[r.evento]} de ${NOMBRE_MARCA[r.marca]}`}
                          onClick={() => setEditando(r)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          aria-label={`Eliminar regla ${NOMBRE_EVENTO[r.evento]} de ${NOMBRE_MARCA[r.marca]}`}
                          onClick={() => setEliminando(r)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            );
          }}
        </EstadoCarga>
      </Tarjeta>

      <Dialog
        open={editando !== null}
        onOpenChange={(abierto: boolean) => !abierto && setEditando(null)}
      >
        <DialogContent className="sm:max-w-md">
          {editando !== null && (
            <FormularioRegla
              regla={editando === "nueva" ? null : editando}
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
        onOpenChange={(abierto: boolean) => !abierto && setEliminando(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta regla?</AlertDialogTitle>
            <AlertDialogDescription>
              {eliminando &&
                `${NOMBRE_EVENTO[eliminando.evento]} · ${NOMBRE_MARCA[eliminando.marca]}. `}
              Los eventos futuros dejarán de otorgar puntos; los puntos ya
              otorgados no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmarEliminar}
              disabled={ocupado !== null}
            >
              Eliminar regla
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const esquema = z.object({
  evento: eventoSchema,
  marca: marcaSchema,
  puntos: z
    .number({ error: "Ingresa una cantidad de puntos." })
    .int("Debe ser un número entero.")
    .min(1, "Debe ser mayor que cero.")
    .max(1_000_000, "Máximo 1.000.000 de puntos."),
  activa: z.boolean(),
});
type Datos = z.infer<typeof esquema>;

function FormularioRegla({
  regla,
  alGuardar,
}: {
  regla: Regla | null;
  alGuardar: (texto: string) => void;
}) {
  const sesion = useSesion();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: regla
      ? {
          evento: regla.evento,
          marca: regla.marca,
          puntos: regla.puntos,
          activa: regla.activa,
        }
      : { evento: "compra", marca: "zontes", activa: true },
  });
  const valores = useWatch({ control });
  const puntosValidos =
    typeof valores.puntos === "number" &&
    Number.isInteger(valores.puntos) &&
    valores.puntos > 0;

  const guardar = async (d: Datos) => {
    setError(null);
    try {
      if (regla) {
        await actualizarRegla(sesion.api(), regla.id, {
          marca: d.marca,
          puntos: d.puntos,
          activa: d.activa,
        });
        alGuardar(
          "Regla actualizada. El cambio se aplica a los eventos que se registren desde ahora.",
        );
      } else {
        await crearRegla(sesion.api(), d);
        alGuardar("Regla creada.");
      }
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(guardar)}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{regla ? "Editar regla" : "Nueva regla"}</DialogTitle>
        <DialogDescription>
          {regla
            ? "Puedes cambiar marca, puntos y estado. El tipo de evento no cambia."
            : "Elige el evento, la marca y los puntos que otorga."}
        </DialogDescription>
      </DialogHeader>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Selector
        id="r-evento"
        etiqueta="Tipo de evento"
        opciones={OPC_EVENTO}
        disabled={!!regla}
        error={errors.evento?.message}
        {...register("evento")}
      />
      <Selector
        id="r-marca"
        etiqueta="Marca"
        opciones={OPC_MARCA}
        error={errors.marca?.message}
        {...register("marca")}
      />
      <Campo
        id="r-puntos"
        etiqueta="Puntos"
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        error={errors.puntos?.message}
        {...register("puntos", { valueAsNumber: true })}
      />
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch
          checked={valores.activa ?? true}
          onCheckedChange={(v: boolean) => setValue("activa", v)}
          aria-label="Regla activa"
        />
        {valores.activa
          ? "Activa: otorga puntos"
          : "Inactiva: no otorga puntos"}
      </label>
      <p
        aria-live="polite"
        className="rounded-xl bg-secondary p-3 text-sm"
        data-testid="resumen-regla"
      >
        {puntosValidos && valores.evento && valores.marca
          ? resumenRegla(
              valores.evento,
              NOMBRE_MARCA[valores.marca],
              valores.puntos!,
            )
          : "Completa los puntos para ver el resumen."}
      </p>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Guardando…"
            : regla
              ? "Guardar cambios"
              : "Crear regla"}
        </Button>
      </DialogFooter>
    </form>
  );
}

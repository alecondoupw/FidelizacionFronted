"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Selector } from "@/components/comun/selector";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { guardarArchivo, type EstadoCanje } from "@/lib/api/canjes";
import type { Marca } from "@/lib/api/contract";
import type { Evento } from "@/lib/api/puntos";
import {
  descargarExportacion,
  getVistaPrevia,
  type FiltrosExportacion,
  type Formato,
  type TipoExportacion,
  type TipoMovimiento,
} from "@/lib/api/reportes";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoPuntos,
  NOMBRE_ESTADO_CANJE,
  NOMBRE_EVENTO,
  NOMBRE_TIPO,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { rangoDe } from "@/lib/periodos";
import { useCarga } from "@/lib/use-carga";
import { Chip } from "./reportes-comun";

const TIPOS: { id: TipoExportacion; texto: string }[] = [
  { id: "clientes", texto: "Clientes" },
  { id: "movimientos", texto: "Movimientos" },
  { id: "canjes", texto: "Canjes" },
  { id: "actividad", texto: "Reporte de actividad" },
];
const opciones = <T extends string>(
  nombres: Record<T, string>,
  todos: string,
) => [
  { valor: "", texto: todos },
  ...(Object.keys(nombres) as T[]).map((k) => ({
    valor: k,
    texto: nombres[k],
  })),
];

export interface InicialExportar {
  tipo?: TipoExportacion;
  desde?: string;
  hasta?: string;
  marca?: Marca;
  estado?: EstadoCanje;
  tipoMovimiento?: TipoMovimiento;
  evento?: Evento;
}

interface Hecha {
  nombre: string;
  filas: number;
}

/**
 * UI-11 Exportar datos (A12, DEC-09): el archivo contiene sólo lo que
 * cumple los filtros; hasta 10.000 filas; cada exportación queda auditada.
 */
export function Exportar({ inicial }: { inicial: InicialExportar }) {
  const sesion = useSesion();
  const me = usePerfil();
  const treinta = rangoDe("30d");
  const [tipo, setTipo] = useState<TipoExportacion>(inicial.tipo ?? "clientes");
  const [desde, setDesde] = useState(
    inicial.desde ??
      (inicial.tipo && inicial.tipo !== "clientes" ? treinta.desde : ""),
  );
  const [hasta, setHasta] = useState(
    inicial.hasta ??
      (inicial.tipo && inicial.tipo !== "clientes" ? treinta.hasta : ""),
  );
  const [marca, setMarca] = useState<Marca | "">(inicial.marca ?? "");
  const [estadoCliente, setEstadoCliente] = useState<"" | "true" | "false">("");
  const [vinculo, setVinculo] = useState<"" | "vinculado" | "no_vinculado">("");
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimiento | "">(
    inicial.tipoMovimiento ?? "",
  );
  const [evento, setEvento] = useState<Evento | "">(inicial.evento ?? "");
  const [estadoCanje, setEstadoCanje] = useState<EstadoCanje | "">(
    inicial.estado ?? "",
  );
  const [formato, setFormato] = useState<Formato>("xlsx");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hechas, setHechas] = useState<Hecha[]>([]);

  const conPeriodo = tipo !== "clientes";
  // Movimientos, canjes y actividad exigen periodo; si falta se propone 30 días.
  const elegirTipo = (t: TipoExportacion) => {
    setTipo(t);
    if (t !== "clientes" && (!desde || !hasta)) {
      setDesde(treinta.desde);
      setHasta(treinta.hasta);
    }
  };

  const filtros: FiltrosExportacion = {
    desde: desde || undefined,
    hasta: hasta || undefined,
    marca: marca || undefined,
    ...(tipo === "clientes"
      ? {
          activo: estadoCliente ? estadoCliente === "true" : undefined,
          vinculo: vinculo || undefined,
        }
      : {}),
    ...(tipo === "movimientos"
      ? { tipo: tipoMovimiento || undefined, evento: evento || undefined }
      : {}),
    ...(tipo === "canjes" ? { estado: estadoCanje || undefined } : {}),
  };
  const listo = !conPeriodo || (desde && hasta);
  const previa = useCarga(
    () =>
      listo
        ? getVistaPrevia(sesion.api(), tipo, filtros)
        : Promise.resolve({ filas: 0, columnas: [], maximo: 10000 }),
    [me.uid, tipo, JSON.stringify(filtros)],
  );

  const generar = async () => {
    setGenerando(true);
    setError(null);
    try {
      const blob = await descargarExportacion(
        sesion.api(),
        tipo,
        filtros,
        formato,
      );
      const nombre = `${tipo}-${desde && hasta ? `${desde}_${hasta}` : "todos"}.${formato}`;
      guardarArchivo(blob, nombre);
      setHechas((h) => [
        {
          nombre,
          filas: previa.carga.estado === "listo" ? previa.carga.datos.filas : 0,
        },
        ...h,
      ]);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Exportar datos"
        descripcion="El archivo contiene únicamente los datos que cumplen los filtros aplicados."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <Tarjeta>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              1 · Datos a exportar
            </legend>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <Chip
                  key={t.id}
                  activo={tipo === t.id}
                  onClick={() => elegirTipo(t.id)}
                >
                  {t.texto}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              2 · Filtros
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-desde">
                  {conPeriodo ? "Desde" : "Registrados desde"}
                </Label>
                <Input
                  id="exp-desde"
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(e) => setDesde(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-hasta">
                  {conPeriodo ? "Hasta" : "Registrados hasta"}
                </Label>
                <Input
                  id="exp-hasta"
                  type="date"
                  value={hasta}
                  min={desde || undefined}
                  onChange={(e) => setHasta(e.target.value)}
                  className="h-10"
                />
              </div>
              <Selector
                id="exp-marca"
                etiqueta="Marca"
                value={marca}
                onChange={(e) => setMarca(e.target.value as Marca | "")}
                opciones={opciones(NOMBRE_MARCA, "Todas")}
              />
              {tipo === "clientes" && (
                <>
                  <Selector
                    id="exp-estado"
                    etiqueta="Estado"
                    value={estadoCliente}
                    onChange={(e) =>
                      setEstadoCliente(e.target.value as "" | "true" | "false")
                    }
                    opciones={[
                      { valor: "", texto: "Todos" },
                      { valor: "true", texto: "Activos" },
                      { valor: "false", texto: "Inactivos" },
                    ]}
                  />
                  <Selector
                    id="exp-vinculo"
                    etiqueta="Vinculación"
                    value={vinculo}
                    onChange={(e) =>
                      setVinculo(
                        e.target.value as "" | "vinculado" | "no_vinculado",
                      )
                    }
                    opciones={[
                      { valor: "", texto: "Todas" },
                      { valor: "vinculado", texto: "Vinculados" },
                      { valor: "no_vinculado", texto: "No vinculados" },
                    ]}
                  />
                </>
              )}
              {tipo === "movimientos" && (
                <>
                  <Selector
                    id="exp-tipo"
                    etiqueta="Tipo"
                    value={tipoMovimiento}
                    onChange={(e) =>
                      setTipoMovimiento(e.target.value as TipoMovimiento | "")
                    }
                    opciones={opciones(NOMBRE_TIPO, "Todos")}
                  />
                  <Selector
                    id="exp-evento"
                    etiqueta="Evento"
                    value={evento}
                    onChange={(e) => setEvento(e.target.value as Evento | "")}
                    opciones={opciones(NOMBRE_EVENTO, "Todos")}
                  />
                </>
              )}
              {tipo === "canjes" && (
                <Selector
                  id="exp-estado-canje"
                  etiqueta="Estado"
                  value={estadoCanje}
                  onChange={(e) =>
                    setEstadoCanje(e.target.value as EstadoCanje | "")
                  }
                  opciones={opciones(NOMBRE_ESTADO_CANJE, "Todos")}
                />
              )}
            </div>
            {!conPeriodo && (
              <p className="text-xs text-muted-foreground">
                Sin fechas se exportan todos los clientes vigentes.
              </p>
            )}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              3 · Formato
            </legend>
            <div className="flex flex-wrap gap-2">
              <Chip
                activo={formato === "xlsx"}
                onClick={() => setFormato("xlsx")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileSpreadsheet aria-hidden="true" className="size-4" />{" "}
                  Excel
                </span>
              </Chip>
              <Chip
                activo={formato === "csv"}
                onClick={() => setFormato("csv")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <FileText aria-hidden="true" className="size-4" /> CSV
                </span>
              </Chip>
            </div>
          </fieldset>
          <EstadoCarga
            carga={previa.carga}
            recargar={previa.recargar}
            etiqueta="la vista previa"
            alto="h-16"
          >
            {(p) => (
              <div
                className="rounded-xl bg-muted/60 p-4 text-sm"
                aria-live="polite"
              >
                <p className="font-semibold" data-testid="filas-exportacion">
                  {formatoPuntos(p.filas)}{" "}
                  {p.filas === 1 ? "registro" : "registros"} con los filtros
                  aplicados
                </p>
                {p.columnas.length > 0 && (
                  <p className="text-muted-foreground">
                    Columnas: {p.columnas.join(" · ")}
                  </p>
                )}
              </div>
            )}
          </EstadoCarga>
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            className="h-11 w-fit"
            disabled={
              generando ||
              !listo ||
              previa.carga.estado !== "listo" ||
              previa.carga.datos.filas === 0
            }
            onClick={generar}
          >
            <Download aria-hidden="true" />{" "}
            {generando ? "Generando…" : "Generar exportación"}
          </Button>
        </Tarjeta>
        <Tarjeta titulo="Exportaciones de esta sesión" className="h-fit">
          <p className="text-sm text-muted-foreground">
            Sólo administradores pueden exportar. Cada exportación queda
            registrada en la auditoría con sus filtros.
          </p>
          {hechas.length > 0 && (
            <ul
              className="divide-y text-sm"
              aria-label="Exportaciones de esta sesión"
            >
              {hechas.map((h, i) => (
                <li key={i} className="flex justify-between gap-2 py-2">
                  <span className="truncate">{h.nombre}</span>
                  <span className="text-muted-foreground">
                    {formatoPuntos(h.filas)} filas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}

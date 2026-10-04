"use client";

import { Download, FileUp, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Chip } from "@/components/comun/chip";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { Selector } from "@/components/comun/selector";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { guardarArchivo } from "@/lib/api/canjes";
import type { Marca } from "@/lib/api/contract";
import {
  confirmarImportacion,
  descargarReporteImportacion,
  getImportaciones,
  vistaPreviaImportacion,
  type EstadoFila,
  type FilaImportacion,
  type ResumenImportacion,
  type VistaPreviaImportacion,
} from "@/lib/api/importaciones";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFechaHora, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";

const OPC_MARCA = (Object.keys(NOMBRE_MARCA) as Marca[]).map((m) => ({
  valor: m,
  texto: NOMBRE_MARCA[m],
}));
const POR_PAGINA = 100;
const MAX_BYTES = 5 * 1024 * 1024;

export const NOMBRE_ESTADO_FILA: Record<EstadoFila, string> = {
  nuevo: "Se importa",
  nueva_asociacion: "Se importa (marca nueva)",
  ya_importado: "Duplicado: ya importado",
  duplicado_archivo: "Duplicado en el archivo",
  conflicto: "Conflicto",
  revision: "Revisión",
  error: "Error",
};
const CLASE_ESTADO: Record<EstadoFila, string> = {
  nuevo: "bg-exito-suave text-exito",
  nueva_asociacion: "bg-exito-suave text-exito",
  ya_importado: "bg-muted text-muted-foreground",
  duplicado_archivo: "bg-muted text-muted-foreground",
  conflicto: "bg-aviso-suave text-aviso",
  revision: "bg-aviso-suave text-aviso",
  error: "bg-destructive/10 text-destructive",
};
const NOMBRE_VINCULO = {
  vinculara: "Se vinculará a su cuenta",
  vinculado: "Vinculado a su cuenta",
  ya_vinculado: "Ya vinculado",
  pendiente: "Pendiente de registro",
} as const;
const FILTROS: [string, (f: FilaImportacion) => boolean][] = [
  ["Todas", () => true],
  [
    "Se importan",
    (f) => f.estado === "nuevo" || f.estado === "nueva_asociacion",
  ],
  [
    "Duplicados",
    (f) => f.estado === "ya_importado" || f.estado === "duplicado_archivo",
  ],
  [
    "Conflictos y revisión",
    (f) => f.estado === "conflicto" || f.estado === "revision",
  ],
  ["Errores", (f) => f.estado === "error"],
];

type Paso =
  | { tipo: "archivo" }
  | { tipo: "vista"; vista: VistaPreviaImportacion }
  | { tipo: "hecho"; id: string; resumen: ResumenImportacion; marca: Marca };

/**
 * UI-23 Importar clientes (A02, SRC-06 pp. 1–2, DEC-17): una marca por
 * archivo CSV o XLSX, vista previa por fila, confirmación de las filas
 * válidas y reporte descargable. Nunca crea cuentas ni administradores.
 */
export function ImportarClientes() {
  const sesion = useSesion();
  const me = usePerfil();
  const entrada = useRef<HTMLInputElement>(null);
  const [marca, setMarca] = useState<Marca>("zontes");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [paso, setPaso] = useState<Paso>({ tipo: "archivo" });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clave de idempotencia de la confirmación: se renueva con cada archivo.
  const [clave, setClave] = useState(() => crypto.randomUUID());
  const historial = useCarga(
    () => getImportaciones(sesion.api()),
    [me.uid, paso.tipo],
  );

  const reiniciar = () => {
    setPaso({ tipo: "archivo" });
    setArchivo(null);
    setError(null);
    setClave(crypto.randomUUID());
    if (entrada.current) entrada.current.value = "";
  };

  const verPrevia = async () => {
    setError(null);
    if (!archivo) {
      setError("Elige un archivo CSV o XLSX.");
      return;
    }
    if (archivo.size > MAX_BYTES) {
      setError("El archivo supera el máximo de 5 MB.");
      return;
    }
    setOcupado(true);
    try {
      const vista = await vistaPreviaImportacion(sesion.api(), marca, archivo);
      setPaso({ tipo: "vista", vista });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = async (vista: VistaPreviaImportacion) => {
    setError(null);
    setOcupado(true);
    try {
      const r = await confirmarImportacion(
        sesion.api(),
        { marca: vista.marca, archivo: archivo!.name, idImportacion: clave },
        archivo!,
      );
      setPaso({
        tipo: "hecho",
        id: r.id,
        resumen: r.resumen,
        marca: vista.marca,
      });
    } catch (e) {
      // Con respuesta del servidor el intento terminó: un reintento es otro.
      if (e instanceof ApiError && e.status > 0) setClave(crypto.randomUUID());
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const descargar = async (id: string, formato: "csv" | "xlsx") => {
    try {
      const blob = await descargarReporteImportacion(sesion.api(), id, formato);
      guardarArchivo(blob, `reporte-importacion-${id.slice(0, 8)}.${formato}`);
    } catch (e) {
      setError(mensajeError(e));
    }
  };

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
        <span aria-current="page">Importar clientes</span>
      </nav>
      <EncabezadoPagina
        titulo="Importar clientes"
        descripcion="Carga los clientes de una marca. Se vinculan por correo electrónico; no se crean cuentas de acceso."
      />

      {paso.tipo === "archivo" && (
        <Tarjeta titulo="1. Archivo" className="max-w-2xl">
          <div className="flex flex-col gap-4">
            <Selector
              id="imp-marca"
              etiqueta="Marca de origen"
              opciones={OPC_MARCA}
              value={marca}
              onChange={(e) => setMarca(e.target.value as Marca)}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imp-archivo">Archivo CSV o XLSX</Label>
              <input
                ref={entrada}
                id="imp-archivo"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                aria-describedby="imp-archivo-ayuda"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-3 file:h-10 file:rounded-lg file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-medium hover:file:bg-muted"
              />
              <p
                id="imp-archivo-ayuda"
                className="text-xs text-muted-foreground"
              >
                Columnas obligatorias: nombre y correo electrónico, en la
                primera fila. Máximo 5.000 filas y 5 MB. Cada archivo
                corresponde a una sola marca.
              </p>
            </div>
            <Button
              className="h-11 w-fit"
              disabled={ocupado}
              onClick={() => void verPrevia()}
            >
              <FileUp aria-hidden="true" />
              {ocupado ? "Revisando el archivo…" : "Ver vista previa"}
            </Button>
          </div>
        </Tarjeta>
      )}

      {paso.tipo === "vista" && (
        <VistaPrevia
          vista={paso.vista}
          archivo={archivo?.name ?? ""}
          ocupado={ocupado}
          alCancelar={reiniciar}
          alConfirmar={() => void confirmar(paso.vista)}
        />
      )}

      {paso.tipo === "hecho" && (
        <Tarjeta titulo="3. Resultado" className="max-w-3xl">
          <div className="flex flex-col gap-4">
            <Alert role="status">
              <AlertTitle>
                Importación de {NOMBRE_MARCA[paso.marca]} completada
              </AlertTitle>
              <AlertDescription>
                Los vinculados pueden estar incluidos entre los importados:
                estos indicadores no se suman entre sí.
              </AlertDescription>
            </Alert>
            <Indicadores r={paso.resumen} />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void descargar(paso.id, "csv")}
              >
                <Download aria-hidden="true" /> Reporte CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => void descargar(paso.id, "xlsx")}
              >
                <Download aria-hidden="true" /> Reporte Excel
              </Button>
              <Button variant="ghost" onClick={reiniciar}>
                <RotateCcw aria-hidden="true" /> Importar otro archivo
              </Button>
            </div>
          </div>
        </Tarjeta>
      )}

      {error && (
        <Alert variant="destructive" role="alert" className="max-w-3xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tarjeta
        titulo="Importaciones recientes"
        descripcion="El detalle por fila se conserva 90 días para descargar el reporte."
      >
        <EstadoCarga
          carga={historial.carga}
          recargar={historial.recargar}
          etiqueta="las importaciones"
          alto="h-24"
        >
          {({ items }) =>
            items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay importaciones.
              </p>
            ) : (
              <ul aria-label="Importaciones recientes" className="divide-y">
                {items.map((i) => (
                  <li
                    key={i.id}
                    className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold break-words">
                        {NOMBRE_MARCA[i.marca]} · {i.archivo}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatoFechaHora(i.creadoEn)}
                        {i.resumen &&
                          ` · ${formatoPuntos(i.resumen.importados)} importados, ${formatoPuntos(i.resumen.vinculados)} vinculados, ${formatoPuntos(i.resumen.errores)} errores`}
                      </p>
                    </div>
                    {i.estado === "completada" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Descargar CSV de ${i.archivo}`}
                          onClick={() => void descargar(i.id, "csv")}
                        >
                          CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Descargar Excel de ${i.archivo}`}
                          onClick={() => void descargar(i.id, "xlsx")}
                        >
                          Excel
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </EstadoCarga>
      </Tarjeta>
    </div>
  );
}

function Indicadores({ r }: { r: ResumenImportacion }) {
  const datos: [string, number][] = [
    ["Importados", r.importados],
    ["Vinculados", r.vinculados],
    ["Pendientes de vinculación", r.pendientes],
    ["Duplicados", r.duplicados],
    ["Conflictos", r.conflictos],
    ["En revisión", r.revision],
    ["Errores", r.errores],
  ];
  return (
    <dl
      aria-label="Resumen de la importación"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {datos.map(([t, v]) => (
        <div key={t} className="rounded-xl border bg-card p-3">
          <dt className="text-xs text-muted-foreground">{t}</dt>
          <dd className="text-xl font-bold">{formatoPuntos(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function VistaPrevia({
  vista,
  archivo,
  ocupado,
  alCancelar,
  alConfirmar,
}: {
  vista: VistaPreviaImportacion;
  archivo: string;
  ocupado: boolean;
  alCancelar: () => void;
  alConfirmar: () => void;
}) {
  const [filtro, setFiltro] = useState(0);
  const [mostradas, setMostradas] = useState(POR_PAGINA);
  const filas = vista.filas.filter(FILTROS[filtro]![1]);
  const r = vista.resumen;
  const excluidas = r.duplicados + r.conflictos + r.revision + r.errores;
  const aplicables = r.importados + r.vinculados;

  return (
    <Tarjeta
      titulo="2. Vista previa"
      descripcion={`${NOMBRE_MARCA[vista.marca]} · ${archivo} · ${formatoPuntos(r.filas)} filas. Todavía no se guardó nada.`}
    >
      <div className="flex flex-col gap-4">
        <Indicadores r={r} />
        {excluidas > 0 && (
          <Alert>
            <AlertDescription>
              {formatoPuntos(excluidas)}{" "}
              {excluidas === 1
                ? "fila queda excluida"
                : "filas quedan excluidas"}{" "}
              (duplicados, conflictos, revisión o errores). Para incluirlas,
              corrige el archivo y vuelve a cargarlo.
            </AlertDescription>
          </Alert>
        )}
        <div
          role="group"
          aria-label="Filtrar filas"
          className="flex flex-wrap gap-2"
        >
          {FILTROS.map(([t], i) => (
            <Chip
              key={t}
              activo={filtro === i}
              onClick={() => {
                setFiltro(i);
                setMostradas(POR_PAGINA);
              }}
            >
              {t}
            </Chip>
          ))}
        </div>
        {filas.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Ninguna fila coincide con el filtro.
          </p>
        ) : (
          <ul aria-label="Filas del archivo" className="divide-y">
            {filas.slice(0, mostradas).map((f) => (
              <li
                key={f.fila}
                className="flex flex-col gap-1 py-3 lg:flex-row lg:items-start lg:gap-4"
              >
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  Fila {f.fila}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold break-words">
                    {f.nombre || "Sin nombre"}
                  </p>
                  <p className="text-sm break-all text-muted-foreground">
                    {f.correo || "Sin correo"}
                  </p>
                  {f.motivo && (
                    <p className="text-sm text-muted-foreground">{f.motivo}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:w-80 lg:justify-end">
                  <Badge className={CLASE_ESTADO[f.estado]}>
                    {NOMBRE_ESTADO_FILA[f.estado]}
                  </Badge>
                  {f.vinculacion && (
                    <Badge variant="secondary">
                      {NOMBRE_VINCULO[f.vinculacion]}
                    </Badge>
                  )}
                  {f.asociacionesPrevias.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Ya en{" "}
                      {f.asociacionesPrevias
                        .map((m) => NOMBRE_MARCA[m])
                        .join(", ")}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {filas.length > mostradas && (
          <Button
            variant="outline"
            className="self-center"
            onClick={() => setMostradas((n) => n + POR_PAGINA)}
          >
            Mostrar más filas ({formatoPuntos(filas.length - mostradas)})
          </Button>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            className="h-11"
            disabled={ocupado || aplicables === 0}
            onClick={alConfirmar}
          >
            {ocupado
              ? "Importando…"
              : `Confirmar importación (${formatoPuntos(r.importados)} ${r.importados === 1 ? "fila válida" : "filas válidas"})`}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={ocupado}
            onClick={alCancelar}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Tarjeta>
  );
}

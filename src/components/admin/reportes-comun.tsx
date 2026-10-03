"use client";

import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Chip } from "@/components/comun/chip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Marca } from "@/lib/api/contract";
import type { Variacion } from "@/lib/api/reportes";
import { formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { PRESETS, rangoDe, type Preset } from "@/lib/periodos";
import { cn } from "@/lib/utils";

/** Colores de marca en gráficos (tokens del tema, sin identidad final: DEC-11). */
export const COLOR_MARCA: Record<Marca, string> = {
  zontes: "var(--chart-1)",
  kiden: "var(--chart-5)",
  niu: "var(--chart-3)",
};

export { Chip } from "@/components/comun/chip";

export interface FiltroPeriodo {
  preset: Preset;
  desde: string;
  hasta: string;
  marca?: Marca;
}

export const filtroInicial = (
  preset: Exclude<Preset, "personalizado"> = "30d",
): FiltroPeriodo => ({ preset, ...rangoDe(preset) });

/**
 * Periodo (presets y rango personalizado, DEC-09) y marca. El rango
 * personalizado se aplica con un botón para no consultar en cada tecla.
 */
export function FiltrosPeriodo({
  valor,
  onCambio,
  presets = ["hoy", "7d", "30d", "6m", "personalizado"],
  conMarca = true,
}: {
  valor: FiltroPeriodo;
  onCambio: (f: FiltroPeriodo) => void;
  presets?: Preset[];
  conMarca?: boolean;
}) {
  const [desde, setDesde] = useState(valor.desde);
  const [hasta, setHasta] = useState(valor.hasta);
  const [abierto, setAbierto] = useState(valor.preset === "personalizado");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <div role="group" aria-label="Periodo" className="flex flex-wrap gap-2">
          {PRESETS.filter((p) => presets.includes(p.id)).map((p) => (
            <Chip
              key={p.id}
              activo={valor.preset === p.id}
              onClick={() => {
                if (p.id === "personalizado") {
                  setAbierto(true);
                  return;
                }
                setAbierto(false);
                onCambio({ ...valor, preset: p.id, ...rangoDe(p.id) });
              }}
            >
              {p.texto}
            </Chip>
          ))}
        </div>
        {conMarca && (
          <div role="group" aria-label="Marca" className="flex flex-wrap gap-2">
            {([undefined, "zontes", "kiden", "niu"] as const).map((m) => (
              <Chip
                key={m ?? "todas"}
                activo={valor.marca === m}
                onClick={() => onCambio({ ...valor, marca: m })}
              >
                {m ? NOMBRE_MARCA[m] : "Todas"}
              </Chip>
            ))}
          </div>
        )}
      </div>
      {abierto && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            onCambio({ ...valor, preset: "personalizado", desde, hasta });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="periodo-desde">Desde</Label>
            <Input
              id="periodo-desde"
              type="date"
              value={desde}
              max={hasta}
              onChange={(e) => setDesde(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="periodo-hasta">Hasta</Label>
            <Input
              id="periodo-hasta"
              type="date"
              value={hasta}
              min={desde}
              onChange={(e) => setHasta(e.target.value)}
              className="h-10"
            />
          </div>
          <Button type="submit" className="h-10" disabled={!desde || !hasta}>
            Aplicar
          </Button>
          <p className="text-xs text-muted-foreground sm:self-center">
            Hasta 12 meses, en hora de Bolivia.
          </p>
        </form>
      )}
    </div>
  );
}

export function TextoVariacion({ v }: { v: Variacion }) {
  if (v.porcentaje === null) {
    return (
      <span className="text-xs text-muted-foreground">
        Sin datos del periodo anterior
      </span>
    );
  }
  const sube = v.absoluta >= 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        sube ? "bg-exito-suave text-exito" : "bg-muted text-muted-foreground",
      )}
    >
      <Icono aria-hidden="true" className="size-3.5" />
      {sube ? "+" : ""}
      {v.porcentaje.toLocaleString("es-BO", { maximumFractionDigits: 1 })}%
      <span className="sr-only"> respecto del periodo anterior</span>
    </span>
  );
}

/** KPI que abre su desglose (F5-FE-01) cuando tiene `href`. */
export function TarjetaKpi({
  titulo,
  valor,
  detalle,
  variacion,
  icono: Icono,
  href,
}: {
  titulo: string;
  valor: number;
  detalle?: string;
  variacion?: Variacion;
  icono: LucideIcon;
  href?: string;
}) {
  const contenido = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icono aria-hidden="true" className="size-4.5" />
        </span>
        {variacion && <TextoVariacion v={variacion} />}
      </div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {titulo}
      </p>
      <p className="text-3xl font-extrabold tracking-tight">
        {formatoPuntos(valor)}
      </p>
      {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
    </>
  );
  const clase =
    "flex min-w-0 flex-col gap-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border";
  return href ? (
    <Link
      href={href}
      className={cn(
        clase,
        "transition-shadow hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}

interface Serie {
  clave: string;
  nombre: string;
  color: string;
  discontinua?: boolean;
}

/**
 * Tabla accesible con los mismos datos del gráfico: los lectores de pantalla
 * no leen el SVG y así cada cifra queda verificable. El `sr-only` va en un
 * contenedor: una tabla ignora `width: 1px` y desbordaría la página.
 */
function TablaDatos({
  titulo,
  datos,
  series,
}: {
  titulo: string;
  datos: Record<string, string | number>[];
  series: Serie[];
}) {
  return (
    <div className="sr-only">
      <table>
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Periodo</th>
            {series.map((s) => (
              <th key={s.clave} scope="col">
                {s.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={String(d.etiqueta)}>
              <th scope="row">{d.etiqueta}</th>
              {series.map((s) => (
                <td key={s.clave}>{d[s.clave]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GraficoLineas({
  titulo,
  datos,
  series,
}: {
  titulo: string;
  datos: Record<string, string | number>[];
  series: Serie[];
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={datos}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.clave}
                dataKey={s.clave}
                name={s.nombre}
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.discontinua ? "5 4" : undefined}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TablaDatos titulo={titulo} datos={datos} series={series} />
    </figure>
  );
}

export function GraficoBarras({
  titulo,
  datos,
  series,
  apiladas = false,
}: {
  titulo: string;
  datos: Record<string, string | number>[];
  series: Serie[];
  apiladas?: boolean;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div aria-hidden="true" className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datos}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="etiqueta"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={48}
              allowDecimals={false}
            />
            <Tooltip />
            <Legend />
            {series.map((s) => (
              <Bar
                key={s.clave}
                dataKey={s.clave}
                name={s.nombre}
                fill={s.color}
                stackId={apiladas ? "a" : undefined}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TablaDatos titulo={titulo} datos={datos} series={series} />
    </figure>
  );
}

/** Barra horizontal proporcional (rankings, comparación por marca). */
export function BarraProporcion({
  valor,
  maximo,
  color = "var(--chart-1)",
}: {
  valor: number;
  maximo: number;
  color?: string;
}) {
  const ancho = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 0;
  return (
    <div aria-hidden="true" className="h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full"
        style={{ width: `${ancho}%`, backgroundColor: color }}
      />
    </div>
  );
}

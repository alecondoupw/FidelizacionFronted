"use client";

import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Newspaper,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Marca } from "@/lib/api/contract";
import type {
  CategoriaContenido,
  PublicacionCliente,
} from "@/lib/api/contenidos";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { textoRango } from "@/lib/periodos";
import { cn } from "@/lib/utils";

export const NOMBRE_CATEGORIA_CONTENIDO: Record<CategoriaContenido, string> = {
  noticia: "Noticia",
  evento: "Evento",
  promocion: "Promoción",
};
const ICONO: Record<CategoriaContenido, typeof Tag> = {
  noticia: Newspaper,
  evento: CalendarDays,
  promocion: Tag,
};

/**
 * Superficie por marca sin fotos ni logos (DEC-10/11): color de marca de la
 * línea provisional en un tono suave e icono de la categoría.
 */
export const SUPERFICIE_MARCA: Record<Marca, string> = {
  zontes:
    "bg-[color-mix(in_oklab,var(--chart-1)_14%,var(--card))] text-[var(--chart-1)]",
  kiden:
    "bg-[color-mix(in_oklab,var(--chart-5)_18%,var(--card))] text-[color-mix(in_oklab,var(--chart-5)_70%,black)]",
  niu: "bg-[color-mix(in_oklab,var(--chart-3)_16%,var(--card))] text-[color-mix(in_oklab,var(--chart-3)_70%,black)]",
};

export function IlustracionPublicacion({
  marca,
  categoria,
  className,
}: {
  marca: Marca;
  categoria: CategoriaContenido;
  className?: string;
}) {
  const Icono = ICONO[categoria];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-xl",
        SUPERFICIE_MARCA[marca],
        className,
      )}
    >
      <Icono className="size-10" strokeWidth={1.5} />
    </div>
  );
}

function Metadatos({
  p,
}: {
  p: Pick<PublicacionCliente, "marca" | "categoria">;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs">
      <span className="font-bold tracking-wide uppercase">
        {NOMBRE_MARCA[p.marca]}
      </span>
      <span className="text-muted-foreground">
        · {NOMBRE_CATEGORIA_CONTENIDO[p.categoria]}
      </span>
    </p>
  );
}

function Enlace({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      Más información <ExternalLink aria-hidden="true" className="size-3.5" />
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}

/** Tarjeta de una publicación tal como la ve el cliente (Novedades y vista previa). */
export function TarjetaPublicacion({
  p,
  titulo: Titulo = "h3",
}: {
  p: Omit<PublicacionCliente, "id" | "destacada">;
  titulo?: "h2" | "h3";
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <IlustracionPublicacion
        marca={p.marca}
        categoria={p.categoria}
        className="h-28"
      />
      <Metadatos p={p} />
      <Titulo className="text-lg leading-snug font-bold">{p.titulo}</Titulo>
      {p.texto && <p className="text-sm text-muted-foreground">{p.texto}</p>}
      {p.publicarDesde && (
        <p className="text-xs text-muted-foreground">
          Publicado el {textoRango(p.publicarDesde, p.publicarDesde)}
        </p>
      )}
      {p.enlace && <Enlace href={p.enlace} />}
    </article>
  );
}

/**
 * Carrusel de destacadas en Inicio (C08). Sin avance automático: el cliente
 * cambia de diapositiva con botones accesibles (WCAG 2.2.2).
 */
export function CarruselDestacadas({ items }: { items: PublicacionCliente[] }) {
  const [i, setI] = useState(0);
  if (items.length === 0) return null;
  const p = items[Math.min(i, items.length - 1)]!;
  const varias = items.length > 1;
  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Novedades destacadas"
      className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6 lg:flex-row lg:items-center"
    >
      <IlustracionPublicacion
        marca={p.marca}
        categoria={p.categoria}
        className="h-32 lg:h-40 lg:w-56 lg:shrink-0"
      />
      <div
        aria-roledescription="diapositiva"
        aria-label={varias ? `${i + 1} de ${items.length}` : undefined}
        aria-live="polite"
        className="flex min-w-0 flex-1 flex-col gap-2"
      >
        <Metadatos p={p} />
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
          {p.titulo}
        </h2>
        {p.texto && <p className="text-muted-foreground">{p.texto}</p>}
        <div className="flex flex-wrap items-center gap-4">
          {p.enlace && <Enlace href={p.enlace} />}
          <Link
            href={`/novedades?marca=${p.marca}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Ver novedades de {NOMBRE_MARCA[p.marca]}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
      {varias && (
        <div className="flex items-center gap-2 lg:flex-col">
          <button
            type="button"
            onClick={() => setI((i - 1 + items.length) % items.length)}
            className="flex size-9 items-center justify-center rounded-full ring-1 ring-border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Novedad anterior"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setI((i + 1) % items.length)}
            className="flex size-9 items-center justify-center rounded-full ring-1 ring-border hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            aria-label="Novedad siguiente"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}
    </section>
  );
}

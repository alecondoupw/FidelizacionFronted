"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Carga } from "@/lib/use-carga";

/** Estados de carga y error comunes a todas las vistas (Mapa de vistas, criterio de estados). */
export function EstadoCarga<T>({
  carga,
  recargar,
  etiqueta,
  children,
  alto = "h-32",
}: {
  carga: Carga<T>;
  recargar: () => void;
  etiqueta: string;
  children: (datos: T) => ReactNode;
  alto?: string;
}) {
  if (carga.estado === "cargando") {
    return (
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Cargando {etiqueta}…</span>
        <Skeleton className={`${alto} w-full rounded-2xl`} />
      </div>
    );
  }
  if (carga.estado === "error") {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>No pudimos cargar {etiqueta}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {carga.mensaje}
          <Button variant="outline" size="sm" onClick={recargar}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return <>{children(carga.datos)}</>;
}

export function Tarjeta({
  titulo,
  descripcion,
  accion,
  children,
  className = "",
}: {
  titulo?: string;
  descripcion?: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6 ${className}`}
    >
      {(titulo || accion) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            {titulo && <h2 className="text-lg font-bold">{titulo}</h2>}
            {descripcion && (
              <p className="text-sm text-muted-foreground">{descripcion}</p>
            )}
          </div>
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

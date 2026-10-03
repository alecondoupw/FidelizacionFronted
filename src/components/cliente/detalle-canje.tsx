"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga } from "@/components/comun/estado-carga";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  descargarComprobante,
  descargarQr,
  getMiCanje,
  guardarArchivo,
  type CanjeVista,
} from "@/lib/api/canjes";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, formatoFechaHora, formatoPuntos } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { EtiquetaEstadoCanje } from "./beneficio-visual";

const AYUDA: Record<CanjeVista["estado"], string> = {
  emitido:
    "Presenta este código o el QR para recibir tu beneficio antes de la fecha de vigencia.",
  entregado: "Este beneficio ya fue entregado.",
  vencido:
    "El cupón venció sin usarse. Si crees que es un error, contacta a soporte.",
  anulado: "Este canje fue anulado y los puntos se devolvieron a tu saldo.",
};

/** UI-16 Comprobante / detalle del canje (C04, SRC-03 pp. 7–8): sólo el propietario. */
export function DetalleCanje({ codigo }: { codigo: string }) {
  const sesion = useSesion();
  const me = usePerfil();
  const { carga, recargar } = useCarga(
    () => getMiCanje(sesion.api(), codigo),
    [me.uid, codigo],
  );

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link href="/canjes" className="hover:text-foreground hover:underline">
          Mis canjes
        </Link>
        <span aria-hidden="true"> › </span>
        <span aria-current="page">Detalle</span>
      </nav>
      <EstadoCarga
        carga={carga}
        recargar={recargar}
        etiqueta="el canje"
        alto="h-80"
      >
        {(c) => <Detalle c={c} />}
      </EstadoCarga>
    </div>
  );
}

function Qr({ codigo }: { codigo: string }) {
  const sesion = useSesion();
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    let vigente = true;
    let creada: string | null = null;
    descargarQr(sesion.api(), codigo).then(
      (blob) => {
        if (!vigente) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      },
      () => vigente && setFallo(true),
    );
    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo]);
  if (fallo)
    return (
      <p className="text-xs text-muted-foreground">
        No se pudo cargar el QR; usa el código.
      </p>
    );
  if (!url)
    return (
      <div
        aria-hidden="true"
        className="size-36 animate-pulse rounded-lg bg-muted"
      />
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob local autenticado; next/image no aplica
    <img
      src={url}
      alt={`Código QR del canje ${codigo}`}
      className="size-36 rounded-lg bg-white p-1"
    />
  );
}

function Detalle({ c }: { c: CanjeVista }) {
  const sesion = useSesion();
  const [error, setError] = useState<string | null>(null);
  const vigente = c.estado === "emitido";
  return (
    <section
      aria-labelledby="titulo-canje"
      className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wide uppercase">
            {NOMBRE_MARCA[c.marca]}
          </p>
          <h1
            id="titulo-canje"
            className="text-2xl font-extrabold tracking-tight"
          >
            {c.beneficioNombre}
          </h1>
          {c.varianteNombre !== "Única" && (
            <p className="text-muted-foreground">{c.varianteNombre}</p>
          )}
        </div>
        <EtiquetaEstadoCanje valor={c.estado} />
      </div>
      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        {vigente ? <Qr codigo={c.codigo} /> : null}
        <div>
          <p className="text-sm text-muted-foreground">Código de canje</p>
          <p
            className="font-mono text-2xl font-bold tracking-wider"
            data-testid="codigo-canje"
          >
            {c.codigo}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {AYUDA[c.estado]}
          </p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Fecha del canje</dt>
          <dd>{formatoFechaHora(c.emitidoEn)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Puntos utilizados</dt>
          <dd className="font-semibold">{formatoPuntos(c.puntos)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Válido hasta</dt>
          <dd>{formatoFecha(c.venceEn)}</dd>
        </div>
        {c.entregadoEn && (
          <div>
            <dt className="text-muted-foreground">Entregado</dt>
            <dd>{formatoFechaHora(c.entregadoEn)}</dd>
          </div>
        )}
        {c.anuladoEn && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Anulado</dt>
            <dd>
              {formatoFechaHora(c.anuladoEn)}
              {c.motivoAnulacion ? ` · ${c.motivoAnulacion}` : ""}
            </dd>
          </div>
        )}
      </dl>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        className="w-fit"
        onClick={async () => {
          setError(null);
          try {
            guardarArchivo(
              await descargarComprobante(sesion.api(), c.codigo),
              `comprobante-${c.codigo}.pdf`,
            );
          } catch (e) {
            setError(mensajeError(e));
          }
        }}
      >
        <Download aria-hidden="true" /> Descargar comprobante
      </Button>
    </section>
  );
}

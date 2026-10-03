"use client";

import { CircleCheck, Download, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  canjear,
  descargarComprobante,
  getBeneficio,
  guardarArchivo,
  type BeneficioVista,
  type CanjeVista,
} from "@/lib/api/canjes";
import { getSaldo } from "@/lib/api/puntos";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoFecha,
  formatoFechaHora,
  formatoPuntos,
  NOMBRE_CATEGORIA,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";
import { cn } from "@/lib/utils";
import {
  EtiquetaDisponibilidad,
  EtiquetaEstadoCanje,
  IlustracionBeneficio,
} from "./beneficio-visual";

/** UI-05 detalle, confirmación y resultado del canje (C05, SRC-03 pp. 6–7). */
export function DetalleBeneficio({ id }: { id: string }) {
  const sesion = useSesion();
  const me = usePerfil();
  const datos = useCarga(async () => {
    const [b, s] = await Promise.all([
      getBeneficio(sesion.api(), id),
      getSaldo(sesion.api()),
    ]);
    return {
      b,
      saldo: s.marcas.find((m) => m.marca === b.marca)?.disponible ?? 0,
    };
  }, [me.uid, id]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta" className="text-sm text-muted-foreground">
        <Link
          href="/catalogo"
          className="hover:text-foreground hover:underline"
        >
          Catálogo
        </Link>
        <span aria-hidden="true"> › </span>
        <span aria-current="page">Detalle</span>
      </nav>
      <EstadoCarga
        carga={datos.carga}
        recargar={datos.recargar}
        etiqueta="el beneficio"
        alto="h-80"
      >
        {({ b, saldo }) => <Contenido b={b} saldo={saldo} />}
      </EstadoCarga>
    </div>
  );
}

function Contenido({ b, saldo }: { b: BeneficioVista; saldo: number }) {
  const sesion = useSesion();
  const elegible = b.variantes.find(
    (v) => v.disponibilidad === "disponible" || v.disponibilidad === "ultimas",
  );
  const [variante, setVariante] = useState(
    elegible?.id ?? b.variantes[0]?.id ?? "",
  );
  const [solicitud, setSolicitud] = useState(
    () => `canje-${crypto.randomUUID()}`,
  );
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    canje: CanjeVista;
    disponible: number;
  } | null>(null);

  const elegida = b.variantes.find((v) => v.id === variante);
  const despues = saldo - b.puntos;
  const motivoBloqueo =
    b.disponibilidad === "proximamente"
      ? `Disponible desde el ${formatoFecha(b.disponibleDesde!)}.`
      : !elegida || elegida.disponibilidad === "agotado"
        ? "La opción elegida está agotada."
        : despues < 0
          ? `Te faltan ${formatoPuntos(-despues)} puntos de ${NOMBRE_MARCA[b.marca]}.`
          : null;

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await canjear(sesion.api(), {
        beneficioId: b.id,
        varianteId: variante,
        idSolicitud: solicitud,
      });
      setResultado(r);
      setSolicitud(`canje-${crypto.randomUUID()}`);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  };

  if (resultado) return <ResultadoCanje r={resultado} />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <section
        aria-labelledby="titulo-beneficio"
        className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border sm:p-6"
      >
        <IlustracionBeneficio categoria={b.categoria} className="h-40" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold tracking-wide uppercase">
            {NOMBRE_MARCA[b.marca]}
          </span>
          <span className="text-muted-foreground">
            · {NOMBRE_CATEGORIA[b.categoria]}
          </span>
          <EtiquetaDisponibilidad valor={b.disponibilidad} />
        </div>
        <h1
          id="titulo-beneficio"
          className="text-2xl font-extrabold tracking-tight"
        >
          {b.nombre}
        </h1>
        {b.descripcion && (
          <p className="text-muted-foreground">{b.descripcion}</p>
        )}
        {b.caracteristicas.length > 0 && (
          <ul className="flex list-inside list-disc flex-col gap-1 text-sm">
            {b.caracteristicas.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
        {b.variantes.length > 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Opciones</legend>
            <div className="flex flex-wrap gap-2">
              {b.variantes.map((v) => {
                const agotada =
                  v.disponibilidad === "agotado" ||
                  v.disponibilidad === "proximamente";
                return (
                  <label
                    key={v.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      agotada && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="variante"
                      value={v.id}
                      checked={variante === v.id}
                      disabled={agotada}
                      onChange={() => setVariante(v.id)}
                      className="sr-only"
                    />
                    {v.nombre}
                    {v.disponibilidad !== "disponible" && (
                      <span className="text-xs text-muted-foreground">
                        (
                        {v.disponibilidad === "ultimas" ? "últimas" : "agotada"}
                        )
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info aria-hidden="true" className="size-4" />
          El cupón vale {b.vigenciaCuponDias}{" "}
          {b.vigenciaCuponDias === 1 ? "día" : "días"} desde el canje.
        </p>
      </section>

      <Tarjeta titulo="Resumen del canje" className="h-fit">
        <dl className="divide-y text-sm">
          <div className="flex justify-between py-2">
            <dt>Costo del beneficio</dt>
            <dd className="font-bold">{formatoPuntos(b.puntos)} puntos</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Tus puntos de {NOMBRE_MARCA[b.marca]}</dt>
            <dd className="font-bold">{formatoPuntos(saldo)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt>Después del canje</dt>
            <dd className={cn("font-bold", despues < 0 && "text-destructive")}>
              {formatoPuntos(despues)}
            </dd>
          </div>
        </dl>
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {motivoBloqueo ? (
          <p role="status" className="rounded-xl bg-muted p-3 text-sm">
            {motivoBloqueo}
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-xl bg-exito-suave p-3 text-sm text-exito">
            <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
            Tienes puntos suficientes y la opción está disponible. El servidor
            lo confirma al canjear.
          </p>
        )}
        <Button
          size="lg"
          className="h-11"
          disabled={!!motivoBloqueo || enviando}
          onClick={() => setConfirmando(true)}
        >
          {enviando ? "Canjeando…" : "Confirmar canje"}
        </Button>
      </Tarjeta>

      <AlertDialog
        open={confirmando}
        onOpenChange={(abierto: boolean) =>
          !abierto && !enviando && setConfirmando(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmas el canje?</AlertDialogTitle>
            <AlertDialogDescription>
              {b.nombre}
              {elegida && b.variantes.length > 1
                ? ` · ${elegida.nombre}`
                : ""}{" "}
              por {formatoPuntos(b.puntos)} puntos de {NOMBRE_MARCA[b.marca]}.
              Los puntos se descuentan al confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
            <Button onClick={confirmar} disabled={enviando}>
              {enviando ? "Canjeando…" : "Canjear"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ResultadoCanje({
  r,
}: {
  r: { canje: CanjeVista; disponible: number };
}) {
  const sesion = useSesion();
  const [error, setError] = useState<string | null>(null);
  const c = r.canje;
  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border"
    >
      <div className="flex items-center gap-3">
        <CircleCheck aria-hidden="true" className="size-10 text-exito" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            ¡Canje realizado con éxito!
          </h1>
          <p className="text-sm text-muted-foreground">
            Te quedan {formatoPuntos(r.disponible)} puntos de{" "}
            {NOMBRE_MARCA[c.marca]}.
          </p>
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Beneficio</dt>
          <dd className="font-semibold">
            {c.beneficioNombre}
            {c.varianteNombre !== "Única" ? ` · ${c.varianteNombre}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Marca</dt>
          <dd className="font-semibold">{NOMBRE_MARCA[c.marca]}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Código de canje</dt>
          <dd
            className="font-mono text-base font-bold"
            data-testid="codigo-canje"
          >
            {c.codigo}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado</dt>
          <dd>
            <EtiquetaEstadoCanje valor={c.estado} />
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fecha</dt>
          <dd>{formatoFechaHora(c.emitidoEn)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Válido hasta</dt>
          <dd>{formatoFecha(c.venceEn)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Puntos utilizados</dt>
          <dd className="font-semibold">{formatoPuntos(c.puntos)}</dd>
        </div>
      </dl>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
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
        <Link href="/canjes" className={buttonVariants({ variant: "outline" })}>
          Ver mis canjes
        </Link>
        <Link href="/catalogo" className={buttonVariants({ variant: "ghost" })}>
          Seguir navegando
        </Link>
      </div>
    </section>
  );
}

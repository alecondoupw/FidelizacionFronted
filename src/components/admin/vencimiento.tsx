"use client";

import { Hourglass } from "lucide-react";
import { useState } from "react";
import { usePerfil } from "@/components/acceso/guardia-rol";
import { Campo } from "@/components/acceso/campo";
import { EstadoCarga, Tarjeta } from "@/components/comun/estado-carga";
import { Selector } from "@/components/comun/selector";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getHistorialVigencia,
  getVigencias,
  guardarVigencia,
  procesarVencimientos,
  type CambioVigencia,
  type Marca,
  type Unidad,
  type Vigencia,
} from "@/lib/api/puntos";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFechaHora, NOMBRE_UNIDAD, periodoTexto } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { useCarga } from "@/lib/use-carga";

const MAXIMO: Record<Unidad, number> = { dias: 3650, meses: 120, anios: 10 };

/**
 * UI-19 Vencimiento (A06, SRC-02 p. 5): periodo por marca, activable; los
 * cambios sólo valen para puntos otorgados después (sin fecha retroactiva).
 */
export function VencimientoPuntos() {
  const sesion = useSesion();
  const me = usePerfil();
  const vigencias = useCarga(() => getVigencias(sesion.api()), []);
  const historial = useCarga(async () => {
    const marcas = Object.keys(NOMBRE_MARCA) as Marca[];
    const listas = await Promise.all(
      marcas.map((m) => getHistorialVigencia(sesion.api(), m)),
    );
    return listas
      .flatMap((l, i) => l.items.map((c) => ({ ...c, marca: marcas[i]! })))
      .sort((a, b) => (a.en < b.en ? 1 : -1));
  }, []);
  const [proceso, setProceso] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Vencimiento de puntos"
        descripcion="La vigencia se cuenta desde que se otorgan los puntos y vence al final del día (hora de Bolivia). Los cambios se aplican a los puntos que se otorguen desde ahora; los ya otorgados conservan su fecha."
      />
      <EstadoCarga
        carga={vigencias.carga}
        recargar={vigencias.recargar}
        etiqueta="la configuración"
        alto="h-64"
      >
        {({ items }) => (
          <div className="grid gap-4 lg:grid-cols-3">
            {items.map((v) => (
              <TarjetaVigencia
                key={v.marca}
                vigencia={v}
                alGuardar={() => {
                  vigencias.recargar();
                  historial.recargar();
                }}
              />
            ))}
          </div>
        )}
      </EstadoCarga>

      <Tarjeta
        titulo="Procesar vencimientos"
        descripcion="El saldo de cada cliente ya excluye lo vencido al consultarlo. Este proceso registra en el historial los vencimientos pendientes de todas las cuentas; puede repetirse sin descontar dos veces."
        accion={
          <Button
            variant="outline"
            onClick={async () => {
              setProceso("Procesando…");
              try {
                const r = await procesarVencimientos(sesion.api());
                setProceso(
                  `Listo: ${r.lotesVencidos} lote(s) vencido(s) en ${r.cuentas} cuenta(s).`,
                );
              } catch (e) {
                setProceso(mensajeError(e));
              }
            }}
          >
            <Hourglass aria-hidden="true" />
            Procesar ahora
          </Button>
        }
      >
        {proceso && (
          <p role="status" className="text-sm">
            {proceso}
          </p>
        )}
      </Tarjeta>

      <Tarjeta titulo="Historial de configuración">
        <EstadoCarga
          carga={historial.carga}
          recargar={historial.recargar}
          etiqueta="el historial"
        >
          {(items) =>
            items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay cambios registrados.
              </p>
            ) : (
              <ul aria-label="Historial de configuración" className="divide-y">
                {items.map((c, i) => (
                  <li
                    key={`${c.marca}-${c.en}-${i}`}
                    className="grid gap-1 py-3 text-sm sm:grid-cols-[10rem_6rem_1fr_1fr_10rem] sm:items-center sm:gap-3"
                  >
                    <span className="text-muted-foreground">
                      {formatoFechaHora(c.en)}
                    </span>
                    <Badge variant="secondary" className="w-fit">
                      {NOMBRE_MARCA[c.marca]}
                    </Badge>
                    <span>
                      <span className="sr-only">Antes: </span>
                      {describir(c.antes)}
                    </span>
                    <span className="font-semibold">
                      <span className="sr-only">Después: </span>
                      {describir(c.despues)}
                    </span>
                    <span className="text-muted-foreground">
                      {c.actor === me.uid
                        ? "Tú"
                        : `Administrador …${c.actor.slice(-4)}`}
                    </span>
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

const describir = (v: CambioVigencia["antes"]) =>
  v.activa
    ? `Vencen a los ${periodoTexto(v.cantidad, v.unidad)}`
    : "Sin vencimiento";

function TarjetaVigencia({
  vigencia,
  alGuardar,
}: {
  vigencia: Vigencia;
  alGuardar: () => void;
}) {
  const sesion = useSesion();
  const [activa, setActiva] = useState(vigencia.activa);
  const [cantidad, setCantidad] = useState(String(vigencia.cantidad));
  const [unidad, setUnidad] = useState<Unidad>(vigencia.unidad);
  const [estado, setEstado] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const nombre = NOMBRE_MARCA[vigencia.marca];
  const n = Number(cantidad);
  const errorCantidad = !activa
    ? undefined
    : !Number.isInteger(n) || n < 1
      ? "Ingresa un número entero mayor que cero."
      : n > MAXIMO[unidad]
        ? "El periodo máximo es de 10 años."
        : undefined;
  const cambiado =
    activa !== vigencia.activa ||
    (activa && (n !== vigencia.cantidad || unidad !== vigencia.unidad));

  const guardar = async () => {
    setGuardando(true);
    setEstado(null);
    try {
      await guardarVigencia(sesion.api(), vigencia.marca, {
        activa,
        cantidad: activa ? n : vigencia.cantidad,
        unidad: activa ? unidad : vigencia.unidad,
      });
      setEstado({
        tipo: "ok",
        texto: "Guardado. Se aplica a los puntos que se otorguen desde ahora.",
      });
      alGuardar();
    } catch (e) {
      setEstado({ tipo: "error", texto: mensajeError(e) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      aria-labelledby={`vig-${vigencia.marca}`}
      className="flex flex-col gap-4 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={`vig-${vigencia.marca}`} className="text-lg font-bold">
            {nombre}
          </h2>
          <p className="text-xs text-muted-foreground">
            {vigencia.activa
              ? `Vencen a los ${periodoTexto(vigencia.cantidad, vigencia.unidad)}`
              : "Sin vencimiento"}
          </p>
        </div>
        <Switch
          checked={activa}
          onCheckedChange={(v: boolean) => setActiva(v)}
          aria-label={`Vencimiento activo para ${nombre}`}
        />
      </div>
      {activa ? (
        <div className="grid grid-cols-2 gap-3">
          <Campo
            id={`cantidad-${vigencia.marca}`}
            etiqueta="Periodo"
            type="number"
            inputMode="numeric"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            error={errorCantidad}
          />
          <Selector
            id={`unidad-${vigencia.marca}`}
            etiqueta="Unidad"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value as Unidad)}
            opciones={(Object.keys(NOMBRE_UNIDAD) as Unidad[]).map((u) => ({
              valor: u,
              texto: NOMBRE_UNIDAD[u].varios,
            }))}
          />
        </div>
      ) : (
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          Los puntos permanecerán vigentes hasta ser utilizados.
        </p>
      )}
      {estado && (
        <Alert
          variant={estado.tipo === "error" ? "destructive" : "default"}
          role={estado.tipo === "error" ? "alert" : "status"}
        >
          <AlertDescription>{estado.texto}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={guardar}
        disabled={!cambiado || !!errorCantidad || guardando}
      >
        {guardando ? "Guardando…" : `Guardar ${nombre}`}
      </Button>
    </section>
  );
}

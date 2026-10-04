"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Campo } from "@/components/acceso/campo";
import { Tarjeta } from "@/components/comun/estado-carga";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { getClientes, type Cliente } from "@/lib/api/identidades";
import { asignarPuntos } from "@/lib/api/puntos";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import {
  formatoDia,
  formatoFecha,
  hoyEnBolivia,
  puntosTexto,
  sumarAnios,
} from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";

/** Máximo para la fecha de vencimiento (DEC-18): el backend valida el límite exacto. */
const MAX_ANIOS = 2;

type Resultado = { tipo: "ok" | "aviso" | "error"; texto: string } | null;

/**
 * Clave de idempotencia: se conserva mientras no haya una respuesta del
 * servidor, para que reintentar tras un fallo de red no registre dos veces.
 */
function useClave() {
  const nueva = () => `panel-${crypto.randomUUID()}`;
  const [clave, setClave] = useState(nueva);
  return { clave, renovar: () => setClave(nueva()) };
}

const esquema = z.object({
  marca: z.enum(["zontes", "kiden", "niu"], "Elige la marca."),
  puntos: z.coerce
    .number<string>("Ingresa los puntos.")
    .int("Usa un número entero.")
    .min(1, "Ingresa una cantidad mayor que cero.")
    .max(1_000_000, "Máximo 1.000.000."),
  motivo: z
    .string()
    .trim()
    .min(5, "Describe el motivo (mínimo 5 caracteres).")
    .max(300),
  vence: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha de vencimiento."),
});
type Entrada = z.input<typeof esquema>;
type Datos = z.output<typeof esquema>;

/**
 * Registrar puntos (UI-24, SRC-06 p. 3, DEC-18): un único formulario que sólo
 * suma, con motivo y fecha de vencimiento propia para cada asignación.
 */
export function RegistrarPuntos() {
  const sesion = useSesion();
  const { clave, renovar } = useClave();
  const [correo, setCorreo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [revisando, setRevisando] = useState<Datos | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [r, setR] = useState<Resultado>(null);
  const hoy = hoyEnBolivia();
  const maximo = sumarAnios(hoy, MAX_ANIOS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Entrada, unknown, Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { puntos: "", motivo: "", vence: "" },
  });

  const buscar = async () => {
    setR(null);
    setCliente(null);
    setErrorBusqueda(null);
    const valor = correo.trim();
    if (!z.email().safeParse(valor).success) {
      setErrorBusqueda("Ingresa el correo completo del cliente.");
      return;
    }
    setBuscando(true);
    try {
      const { items } = await getClientes(sesion.api(), {
        correo: valor,
        limite: 1,
      });
      const encontrado = items[0];
      if (!encontrado) {
        setErrorBusqueda("No hay un cliente registrado con ese correo.");
      } else if (!encontrado.activo) {
        setErrorBusqueda("La cuenta de ese cliente está desactivada.");
      } else if (encontrado.marcas.length === 0) {
        setErrorBusqueda(
          "Ese cliente no está vinculado a ninguna marca: impórtalo primero.",
        );
      } else {
        setCliente(encontrado);
        setValue("marca", encontrado.marcas[0]!);
      }
    } catch (e) {
      setErrorBusqueda(mensajeError(e));
    } finally {
      setBuscando(false);
    }
  };

  const registrar = async () => {
    const d = revisando!;
    setEnviando(true);
    try {
      const res = await asignarPuntos(sesion.api(), {
        idSolicitud: clave,
        correoCliente: cliente!.correo,
        marca: d.marca,
        puntos: d.puntos,
        motivo: d.motivo,
        vence: d.vence,
      });
      setR({
        tipo: res.repetido ? "aviso" : "ok",
        texto: `${res.repetido ? "Esta asignación ya estaba registrada: " : "Se sumaron "}${puntosTexto(res.puntos)} a ${nombreDe(cliente!)} en ${NOMBRE_MARCA[d.marca]}; vencen el ${formatoFecha(res.venceEn)}. Saldo de la marca: ${puntosTexto(res.disponible)}.`,
      });
      renovar();
      reset({ marca: d.marca, puntos: "", motivo: "", vence: "" });
      setRevisando(null);
    } catch (e) {
      // Sin respuesta del servidor se conserva la clave: reintentar no duplica.
      if (e instanceof ApiError && e.status > 0) renovar();
      setR({ tipo: "error", texto: mensajeError(e) });
      setRevisando(null);
    } finally {
      setEnviando(false);
    }
  };

  const opcionesMarca = (cliente?.marcas ?? []).map((m) => ({
    valor: m,
    texto: NOMBRE_MARCA[m],
  }));

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Registrar puntos"
        descripcion="Suma puntos a un cliente e indica el motivo y la fecha en que vencerán."
      />
      <Tarjeta className="max-w-2xl">
        <form
          noValidate
          aria-label="Ajuste de puntos"
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!cliente) {
              setErrorBusqueda("Busca primero al cliente por su correo.");
              return;
            }
            void handleSubmit((d) => {
              setR(null);
              setRevisando(d);
            })(e);
          }}
        >
          <h2 className="text-base font-semibold">Ajuste de puntos</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Campo
                id="rp-correo"
                etiqueta="Correo del cliente"
                type="email"
                autoComplete="off"
                value={correo}
                error={errorBusqueda ?? undefined}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setCliente(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void buscar();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 sm:mb-0"
              disabled={buscando}
              onClick={() => void buscar()}
            >
              <Search aria-hidden="true" />
              {buscando ? "Buscando…" : "Buscar"}
            </Button>
          </div>

          {cliente && (
            <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{nombreDe(cliente)}</span> ·
              vinculado a{" "}
              {cliente.marcas.map((m) => NOMBRE_MARCA[m]).join(", ")}
            </p>
          )}

          <Selector
            id="rp-marca"
            etiqueta="Marca"
            opciones={opcionesMarca}
            disabled={!cliente}
            error={errors.marca?.message}
            {...register("marca")}
          />
          <Campo
            id="rp-puntos"
            etiqueta="Puntos a sumar"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            error={errors.puntos?.message}
            {...register("puntos")}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-motivo">Motivo</Label>
            <Textarea
              id="rp-motivo"
              rows={3}
              aria-invalid={errors.motivo ? true : undefined}
              aria-describedby={errors.motivo ? "rp-motivo-error" : undefined}
              {...register("motivo")}
            />
            {errors.motivo && (
              <p
                id="rp-motivo-error"
                className="text-xs font-medium text-destructive"
              >
                {errors.motivo.message}
              </p>
            )}
          </div>
          <Campo
            id="rp-vence"
            etiqueta="¿Cuándo vencerán?"
            type="date"
            min={hoy}
            max={maximo}
            ayuda="Los puntos vencen al final del día elegido, en hora de Bolivia. Máximo 2 años."
            error={errors.vence?.message}
            {...register("vence")}
          />
          <Button type="submit" className="h-11 w-fit">
            Revisar y registrar
          </Button>
        </form>
      </Tarjeta>
      {r && (
        <Alert
          className="max-w-2xl"
          variant={r.tipo === "error" ? "destructive" : "default"}
          role={r.tipo === "error" ? "alert" : "status"}
        >
          <AlertDescription>{r.texto}</AlertDescription>
        </Alert>
      )}

      <AlertDialog
        open={revisando !== null}
        onOpenChange={(abierto: boolean) =>
          !abierto && !enviando && setRevisando(null)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Registrar estos puntos?</AlertDialogTitle>
            <AlertDialogDescription>
              Revisa los datos: la asignación es definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revisando && cliente && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="min-w-0 break-words">
                {nombreDe(cliente)} · {cliente.correo}
              </dd>
              <dt className="text-muted-foreground">Marca</dt>
              <dd>{NOMBRE_MARCA[revisando.marca]}</dd>
              <dt className="text-muted-foreground">Puntos</dt>
              <dd>{puntosTexto(revisando.puntos)}</dd>
              <dt className="text-muted-foreground">Motivo</dt>
              <dd className="min-w-0 break-words">{revisando.motivo}</dd>
              <dt className="text-muted-foreground">Vencimiento</dt>
              <dd>{formatoDia(revisando.vence)} (fin del día)</dd>
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviando}>Volver</AlertDialogCancel>
            <Button disabled={enviando} onClick={() => void registrar()}>
              {enviando ? "Registrando…" : "Registrar puntos"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const nombreDe = (c: Cliente) => c.nombre ?? c.correo;

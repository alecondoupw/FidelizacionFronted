"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Campo } from "@/components/acceso/campo";
import { Tarjeta } from "@/components/comun/estado-carga";
import { Selector } from "@/components/comun/selector";
import { EncabezadoPagina } from "@/components/shell/shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { marcaSchema } from "@/lib/api/contract";
import {
  ajustarPuntos,
  eventoSchema,
  registrarEvento,
  type Evento,
  type Marca,
} from "@/lib/api/puntos";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { formatoFecha, NOMBRE_EVENTO, puntosTexto } from "@/lib/formato";
import { NOMBRE_MARCA } from "@/lib/marcas";

const OPC_EVENTO = (Object.keys(NOMBRE_EVENTO) as Evento[]).map((e) => ({
  valor: e,
  texto: NOMBRE_EVENTO[e],
}));
const OPC_MARCA = (Object.keys(NOMBRE_MARCA) as Marca[]).map((m) => ({
  valor: m,
  texto: NOMBRE_MARCA[m],
}));

type Resultado = { tipo: "ok" | "aviso" | "error"; texto: string } | null;

/**
 * Clave de idempotencia (DEC-05): se conserva mientras no haya una respuesta
 * del servidor, para que reintentar tras un fallo de red no otorgue dos veces.
 */
function useClave() {
  const nueva = () => `panel-${crypto.randomUUID()}`;
  const [clave, setClave] = useState(nueva);
  return { clave, renovar: () => setClave(nueva()) };
}

function Resultado({ r }: { r: Resultado }) {
  if (!r) return null;
  return (
    <Alert
      variant={r.tipo === "error" ? "destructive" : "default"}
      role={r.tipo === "error" ? "alert" : "status"}
    >
      <AlertDescription>{r.texto}</AlertDescription>
    </Alert>
  );
}

/**
 * Registro manual de eventos y ajustes desde el panel (DEC-05 y DEC-14).
 * UI-24 propuesta: no tiene mockup; sigue la línea visual de A05/A06.
 */
export function RegistrarPuntos() {
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Registrar puntos"
        descripcion="Registra un evento para un cliente o corrige su saldo con un ajuste. Los movimientos son definitivos: un error se corrige con otro ajuste."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <FormularioEvento />
        <FormularioAjuste />
      </div>
    </div>
  );
}

const esquemaEvento = z.object({
  correoCliente: z.email("Ingresa el correo del cliente."),
  marca: marcaSchema,
  evento: eventoSchema,
});

function FormularioEvento() {
  const sesion = useSesion();
  const { clave, renovar } = useClave();
  const [r, setR] = useState<Resultado>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof esquemaEvento>>({
    resolver: zodResolver(esquemaEvento),
    defaultValues: { marca: "zontes", evento: "compra" },
  });

  const enviar = async (d: z.infer<typeof esquemaEvento>) => {
    setR(null);
    try {
      const res = await registrarEvento(sesion.api(), {
        ...d,
        idExterno: clave,
      });
      const marca = NOMBRE_MARCA[d.marca];
      setR(
        res.resultado === "otorgado"
          ? {
              tipo: "ok",
              texto: `${res.repetido ? "Este evento ya estaba registrado: " : "Evento registrado: "}${puntosTexto(res.puntos)} de ${marca}${res.venceEn ? `, vencen el ${formatoFecha(res.venceEn)}` : ", sin vencimiento"}.`,
            }
          : {
              tipo: "aviso",
              texto: `Evento registrado sin puntos: ${res.motivo === "regla_inactiva" ? "la regla de ese evento está inactiva" : "no hay regla para ese evento"} en ${marca}.`,
            },
      );
      renovar();
      reset({ ...d, correoCliente: "" });
    } catch (e) {
      setR({ tipo: "error", texto: mensajeError(e) });
    }
  };

  return (
    <Tarjeta
      titulo="Registrar evento"
      descripcion="Compra, referido, mantenimiento o asistencia. Se aplica la regla activa de la marca."
    >
      <form
        noValidate
        onSubmit={handleSubmit(enviar)}
        className="flex flex-col gap-4"
      >
        <Resultado r={r} />
        <Campo
          id="ev-correo"
          etiqueta="Correo del cliente"
          type="email"
          autoComplete="off"
          error={errors.correoCliente?.message}
          {...register("correoCliente")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selector
            id="ev-marca"
            etiqueta="Marca"
            opciones={OPC_MARCA}
            {...register("marca")}
          />
          <Selector
            id="ev-evento"
            etiqueta="Evento"
            opciones={OPC_EVENTO}
            {...register("evento")}
          />
        </div>
        <Button type="submit" className="sm:w-fit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando…" : "Registrar evento"}
        </Button>
      </form>
    </Tarjeta>
  );
}

const esquemaAjuste = z.object({
  correoCliente: z.email("Ingresa el correo del cliente."),
  marca: marcaSchema,
  puntos: z
    .number({ error: "Ingresa los puntos (negativo para restar)." })
    .int("Debe ser un número entero.")
    .refine((n) => n !== 0, "No puede ser cero.")
    .refine((n) => Math.abs(n) <= 1_000_000, "Máximo 1.000.000 de puntos."),
  motivo: z
    .string()
    .trim()
    .min(5, "Describe el motivo (mínimo 5 caracteres).")
    .max(300, "Máximo 300 caracteres."),
});

function FormularioAjuste() {
  const sesion = useSesion();
  const { clave, renovar } = useClave();
  const [r, setR] = useState<Resultado>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof esquemaAjuste>>({
    resolver: zodResolver(esquemaAjuste),
    defaultValues: { marca: "zontes" },
  });

  const enviar = async (d: z.infer<typeof esquemaAjuste>) => {
    setR(null);
    try {
      const res = await ajustarPuntos(sesion.api(), { ...d, idExterno: clave });
      setR({
        tipo: "ok",
        texto: `${res.repetido ? "Este ajuste ya estaba aplicado. " : "Ajuste aplicado. "}Saldo de ${NOMBRE_MARCA[d.marca]}: ${puntosTexto(res.disponible)}.`,
      });
      renovar();
      reset({ marca: d.marca, correoCliente: "", motivo: "" });
    } catch (e) {
      setR({ tipo: "error", texto: mensajeError(e) });
    }
  };

  return (
    <Tarjeta
      titulo="Ajuste de puntos"
      descripcion="Suma o resta puntos con un motivo. El saldo nunca puede quedar negativo; queda en la auditoría."
    >
      <form
        noValidate
        onSubmit={handleSubmit(enviar)}
        className="flex flex-col gap-4"
      >
        <Resultado r={r} />
        <Campo
          id="aj-correo"
          etiqueta="Correo del cliente"
          type="email"
          autoComplete="off"
          error={errors.correoCliente?.message}
          {...register("correoCliente")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Selector
            id="aj-marca"
            etiqueta="Marca"
            opciones={OPC_MARCA}
            {...register("marca")}
          />
          <Campo
            id="aj-puntos"
            etiqueta="Puntos (+ suma, − resta)"
            type="number"
            inputMode="numeric"
            step={1}
            error={errors.puntos?.message}
            {...register("puntos", { valueAsNumber: true })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="aj-motivo">Motivo</Label>
          <Textarea
            id="aj-motivo"
            rows={3}
            aria-invalid={errors.motivo ? true : undefined}
            aria-describedby={errors.motivo ? "aj-motivo-error" : undefined}
            {...register("motivo")}
          />
          {errors.motivo && (
            <p
              id="aj-motivo-error"
              className="text-xs font-medium text-destructive"
            >
              {errors.motivo.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          variant="secondary"
          className="sm:w-fit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Aplicando…" : "Aplicar ajuste"}
        </Button>
      </form>
    </Tarjeta>
  );
}

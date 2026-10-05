"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Info, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ApiError, registrarCliente } from "@/lib/api";
import type { RegistroResponse } from "@/lib/api/contract";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { NOMBRE_MARCA } from "@/lib/marcas";
import { cn } from "@/lib/utils";
import { Campo } from "./campo";

const esquema = z
  .object({
    nombre: z.string().trim().min(1, "Ingresa tu nombre."),
    apellido: z.string().trim().min(1, "Ingresa tu apellido."),
    correo: z.email("Ingresa un correo válido."),
    contrasena: z
      .string()
      .min(8, "Usa al menos 8 caracteres.")
      .regex(/\d/, "Incluye al menos un número."),
    confirmacion: z.string(),
  })
  .refine((d) => d.contrasena === d.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });
type Datos = z.infer<typeof esquema>;

const PASOS = ["Datos de la cuenta", "Verificación", "Confirmación"] as const;
type Paso = 0 | 1 | 2;

/**
 * UI-02 registro por pasos (C10) y verificación/vínculo (C09), SRC-03 pp. 3–4.
 * El vínculo se evalúa en Express con el correo verificado (I-02 v1); los
 * datos opcionales del mockup (documento, teléfono) no se piden porque
 * ningún contrato los guarda.
 */
export function RegistroCliente() {
  const sesion = useSesion();
  const router = useRouter();
  const [creado, setCreado] = useState(false);
  const [resultado, setResultado] = useState<RegistroResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Un usuario con sesión pero sin registro completo entra directo a verificación.
  const conSesion = sesion.estado === "autenticado";
  const paso: Paso = resultado ? 2 : conSesion || creado ? 1 : 0;

  useEffect(() => {
    if (resultado) document.getElementById("titulo-paso")?.focus();
  }, [resultado]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema) });

  const crear = async (d: Datos) => {
    setError(null);
    try {
      await sesion.crearCuenta({
        nombre: `${d.nombre} ${d.apellido}`,
        correo: d.correo,
        contrasena: d.contrasena,
      });
      setCreado(true);
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const completar = async () => {
    setError(null);
    setAviso(null);
    setOcupado(true);
    try {
      const verificado = await sesion.comprobarVerificacion();
      if (!verificado) {
        setAviso(
          "Aún no vemos tu correo verificado. Abre el enlace que te enviamos y vuelve a intentarlo.",
        );
        return;
      }
      setResultado(await registrarCliente(sesion.api()));
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_REGISTERED") {
        router.replace("/inicio");
        return;
      }
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  const reenviar = async () => {
    setError(null);
    try {
      await sesion.reenviarVerificacion();
      setAviso("Te enviamos un nuevo enlace de verificación.");
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  if (sesion.estado === "cargando") {
    return (
      <p aria-busy="true" className="text-sm text-muted-foreground">
        Cargando…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1
          id="titulo-paso"
          tabIndex={-1}
          className="text-2xl font-extrabold tracking-tight outline-none"
        >
          Registro de cuenta
        </h1>
        <p className="text-muted-foreground">
          Crea tu cuenta de fidelización. Si ya eres cliente, vincularemos tus
          marcas por tu correo.
        </p>
      </div>

      <ol
        aria-label="Progreso del registro"
        className="flex items-center gap-2"
      >
        {PASOS.map((nombre, i) => (
          <li
            key={nombre}
            aria-current={i === paso ? "step" : undefined}
            className="flex flex-1 flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left"
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                i < paso && "bg-exito-suave text-exito",
                i === paso && "bg-primary text-primary-foreground",
                i > paso && "bg-muted text-muted-foreground",
              )}
            >
              {i < paso ? (
                <CircleCheck aria-hidden="true" className="size-4" />
              ) : (
                i + 1
              )}
            </span>
            <span
              className={cn(
                "text-[11px] leading-tight font-semibold sm:text-xs",
                i === paso ? "text-acento" : "text-muted-foreground",
              )}
            >
              {nombre}
              <span className="sr-only">
                {i < paso ? " (completado)" : i === paso ? " (actual)" : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {!sesion.configurada && (
        <Alert role="alert">
          <AlertDescription>
            La autenticación no está configurada en este entorno.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {paso === 0 && (
        <form
          noValidate
          onSubmit={handleSubmit(crear)}
          className="flex flex-col gap-4"
        >
          <div className="flex gap-3 rounded-xl bg-secondary p-4 text-sm">
            <Info
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-acento"
            />
            <p>
              Al verificar tu correo buscaremos si ya eres cliente de Zontes,
              Kiden o NIU. El vínculo se hace sólo por correo.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="nombre"
              etiqueta="Nombre"
              autoComplete="given-name"
              error={errors.nombre?.message}
              {...register("nombre")}
            />
            <Campo
              id="apellido"
              etiqueta="Apellido"
              autoComplete="family-name"
              error={errors.apellido?.message}
              {...register("apellido")}
            />
          </div>
          <Campo
            id="correo"
            etiqueta="Correo electrónico"
            type="email"
            autoComplete="email"
            error={errors.correo?.message}
            {...register("correo")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              id="contrasena"
              etiqueta="Contraseña"
              type="password"
              autoComplete="new-password"
              ayuda="Mínimo 8 caracteres y un número."
              error={errors.contrasena?.message}
              {...register("contrasena")}
            />
            <Campo
              id="confirmacion"
              etiqueta="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              error={errors.confirmacion?.message}
              {...register("confirmacion")}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 sm:w-fit sm:self-end"
            disabled={isSubmitting || !sesion.configurada}
          >
            {isSubmitting ? "Creando cuenta…" : "Continuar"}
          </Button>
        </form>
      )}

      {paso === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 rounded-xl bg-secondary p-4">
            <MailCheck
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-acento"
            />
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">Verifica tu correo</p>
              <p className="text-muted-foreground">
                Enviamos un enlace a{" "}
                <span className="font-medium text-foreground">
                  {sesion.usuario?.correo ?? "tu correo"}
                </span>
                . Ábrelo y vuelve aquí para terminar el registro.
              </p>
            </div>
          </div>
          {aviso && (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {aviso}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              className="h-11"
              onClick={completar}
              disabled={ocupado}
            >
              {ocupado ? "Comprobando…" : "Ya verifiqué mi correo"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11"
              onClick={reenviar}
              disabled={ocupado}
            >
              Reenviar enlace
            </Button>
          </div>
        </div>
      )}

      {paso === 2 && resultado && <ResultadoVinculo resultado={resultado} />}
    </div>
  );
}

function ResultadoVinculo({ resultado }: { resultado: RegistroResponse }) {
  const vinculado = resultado.vinculo === "vinculado";
  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-exito-suave p-6 text-center">
        <CircleCheck aria-hidden="true" className="size-10 text-exito" />
        <p className="text-lg font-bold">Cuenta creada</p>
        <p className="text-sm text-muted-foreground">
          {vinculado
            ? "Encontramos tu registro de cliente y vinculamos estas marcas a tu cuenta."
            : "No encontramos un registro de cliente con este correo. Tu cuenta quedó creada sin marcas vinculadas."}
        </p>
      </div>
      {vinculado && (
        <ul aria-label="Marcas vinculadas" className="flex flex-col gap-2">
          {resultado.marcas.map((m) => (
            <li
              key={m}
              className="flex items-center justify-between rounded-xl border p-3"
            >
              <span className="font-semibold">{NOMBRE_MARCA[m]}</span>
              <Badge className="bg-exito-suave text-exito">
                Cliente registrado
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/inicio"
        className={cn(buttonVariants({ size: "lg" }), "h-11")}
      >
        Ir al inicio
      </Link>
    </div>
  );
}

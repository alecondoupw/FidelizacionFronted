"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, ESPERA_ARRANQUE_MS, getHealth, getMe } from "@/lib/api";
import { leerAviso, mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";
import { Campo } from "./campo";

const esquema = z.object({
  correo: z.email("Ingresa un correo válido."),
  contrasena: z.string().min(1, "Ingresa tu contraseña."),
});
type Datos = z.infer<typeof esquema>;

type Rol = "cliente" | "administrador";

const TEXTOS: Record<Rol, { titulo: string; descripcion: string }> = {
  cliente: {
    titulo: "Iniciar sesión",
    descripcion: "Ingresa con el correo de tu cuenta de fidelización.",
  },
  administrador: {
    titulo: "Acceso de administración",
    descripcion: "Ingresa con tu cuenta de administrador.",
  },
};

/**
 * UI-01 (admin) y UI-02 (cliente). Firebase autentica; /me decide si la
 * cuenta puede entrar por este acceso (rol, estado y registro).
 */
export function FormularioIngreso({
  rol,
  aviso,
}: {
  rol: Rol;
  aviso?: string | null;
}) {
  const sesion = useSesion();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const textos = TEXTOS[rol];
  const avisoTexto = leerAviso(aviso ?? null);

  // Despierta el backend suspendido (DEC-13) mientras se escribe la contraseña.
  useEffect(() => {
    if (sesion.configurada) getHealth(sesion.api()).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema) });

  const rechazar = async (mensaje: string) => {
    await sesion.cerrarSesion();
    setError(mensaje);
  };

  const enviar = async ({ correo, contrasena }: Datos) => {
    setError(null);
    try {
      await sesion.ingresar(correo, contrasena);
      const me = await getMe(sesion.api(), { timeoutMs: ESPERA_ARRANQUE_MS });
      if (me.rol !== rol) {
        await rechazar(
          rol === "administrador"
            ? "Esta cuenta no tiene acceso de administración."
            : "Esta es una cuenta de administración. Usa el acceso de administración.",
        );
        return;
      }
      router.replace(rol === "administrador" ? "/admin/dashboard" : "/inicio");
    } catch (e) {
      if (e instanceof ApiError && e.code === "REGISTRATION_REQUIRED") {
        if (rol === "cliente") {
          router.replace("/registro");
          return;
        }
        await rechazar("Esta cuenta no tiene acceso de administración.");
        return;
      }
      if (e instanceof ApiError && e.code === "EMAIL_NOT_VERIFIED") {
        router.replace("/verificar-correo");
        return;
      }
      if (e instanceof ApiError && e.code === "FORBIDDEN") {
        await rechazar(leerAviso("cuenta-desactivada")!);
        return;
      }
      if (e instanceof ApiError) await sesion.cerrarSesion();
      setError(mensajeError(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {textos.titulo}
        </h1>
        <p className="text-muted-foreground">{textos.descripcion}</p>
      </div>

      {!sesion.configurada && (
        <Alert role="alert">
          <AlertTitle>Autenticación no configurada</AlertTitle>
          <AlertDescription>
            Este entorno aún no está conectado a Firebase. Define las variables
            NEXT_PUBLIC_FIREBASE_* en .env.local.
          </AlertDescription>
        </Alert>
      )}
      {avisoTexto && !error && (
        <Alert aria-live="polite">
          <AlertDescription>{avisoTexto}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit(enviar)}
        className="flex flex-col gap-4"
      >
        <Campo
          id="correo"
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="email"
          error={errors.correo?.message}
          {...register("correo")}
        />
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.contrasena?.message}
          {...register("contrasena")}
        />
        <Button
          type="submit"
          size="lg"
          className="h-11"
          disabled={isSubmitting || !sesion.configurada}
        >
          {isSubmitting ? "Ingresando…" : "Ingresar"}
        </Button>
      </form>

      {rol === "cliente" ? (
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link
            href="/registro"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Las cuentas de administración las crea otro administrador.
        </p>
      )}
    </div>
  );
}

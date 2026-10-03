"use client";

import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";

/**
 * Un administrador cambió el correo del cliente (DEC-04): Express exige
 * verificar el nuevo antes de seguir. El correo de verificación se envía sólo
 * cuando la persona lo pide, para no generar envíos al recargar.
 */
export function VerificarCorreo() {
  const sesion = useSesion();
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (sesion.estado === "anonimo") router.replace("/ingresar");
  }, [router, sesion.estado]);

  const accion = async (fn: () => Promise<void>) => {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await fn();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Verifica tu nuevo correo
        </h1>
        <p className="text-muted-foreground">
          El correo de tu cuenta cambió. Para seguir usando tus puntos y
          beneficios, confirma que es tuyo.
        </p>
      </div>
      <div className="flex gap-3 rounded-xl bg-secondary p-4">
        <MailCheck
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <p className="text-sm text-muted-foreground">
          Enviaremos un enlace a{" "}
          <span className="font-medium break-all text-foreground">
            {sesion.usuario?.correo ?? "tu correo"}
          </span>
          . Ábrelo y vuelve aquí.
        </p>
      </div>
      {aviso && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {aviso}
        </p>
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="h-11"
          disabled={ocupado || sesion.estado !== "autenticado"}
          onClick={() =>
            accion(async () => {
              await sesion.reenviarVerificacion();
              setAviso("Te enviamos el enlace de verificación.");
            })
          }
        >
          Enviar enlace de verificación
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11"
          disabled={ocupado || sesion.estado !== "autenticado"}
          onClick={() =>
            accion(async () => {
              if (await sesion.comprobarVerificacion()) {
                router.replace("/inicio");
              } else {
                setAviso("Todavía no vemos el correo verificado.");
              }
            })
          }
        >
          Ya lo verifiqué
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="h-11"
          onClick={async () => {
            await sesion.cerrarSesion();
            router.replace("/ingresar");
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

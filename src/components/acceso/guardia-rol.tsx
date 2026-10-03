"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, getMe } from "@/lib/api";
import type { MeResponse } from "@/lib/api/contract";
import type { Aviso } from "@/lib/auth/mensajes";
import { mensajeError } from "@/lib/auth/mensajes";
import { useSesion } from "@/lib/auth/sesion";

type Rol = MeResponse["rol"];

type Estado =
  | { tipo: "cargando" }
  | { tipo: "listo"; me: MeResponse }
  | { tipo: "rol-incorrecto"; me: MeResponse }
  | { tipo: "error"; mensaje: string };

const PerfilContext = createContext<MeResponse | null>(null);

/** Perfil confirmado por el backend (I-01) dentro de una zona protegida. */
export function usePerfil(): MeResponse {
  const me = useContext(PerfilContext);
  if (!me) throw new Error("usePerfil requiere GuardiaRol.");
  return me;
}

const INICIO_POR_ROL: Record<Rol, { ruta: string; nombre: string }> = {
  cliente: { ruta: "/marcas", nombre: "tu cuenta de cliente" },
  administrador: {
    ruta: "/admin/perfil",
    nombre: "el panel de administración",
  },
};

/**
 * Protege una zona por rol. La decisión real la toma Express: aquí sólo se
 * redirige según la respuesta de /me y nunca se muestra contenido antes de ella.
 */
export function GuardiaRol({
  rol,
  rutaAcceso,
  children,
}: {
  rol: Rol;
  rutaAcceso: string;
  children: ReactNode;
}) {
  const sesion = useSesion();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  const salir = useCallback(
    async (aviso: Aviso) => {
      await sesion.cerrarSesion();
      router.replace(`${rutaAcceso}?aviso=${aviso}`);
    },
    [router, rutaAcceso, sesion],
  );

  const cargar = useCallback(async (): Promise<Estado | null> => {
    try {
      const me = await getMe(sesion.api());
      return me.rol === rol
        ? { tipo: "listo", me }
        : { tipo: "rol-incorrecto", me };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          await salir("sesion-expirada");
          return null;
        }
        if (error.code === "REGISTRATION_REQUIRED") {
          router.replace("/registro");
          return null;
        }
        if (error.code === "FORBIDDEN") {
          await salir("cuenta-desactivada");
          return null;
        }
      }
      return { tipo: "error", mensaje: mensajeError(error) };
    }
  }, [rol, router, salir, sesion]);

  const autenticado = sesion.estado === "autenticado";
  const uid = sesion.usuario?.uid;

  useEffect(() => {
    if (sesion.estado === "anonimo") router.replace(rutaAcceso);
  }, [router, rutaAcceso, sesion.estado]);

  useEffect(() => {
    if (!autenticado) return;
    let vigente = true;
    cargar().then((siguiente) => {
      if (vigente && siguiente) setEstado(siguiente);
    });
    return () => {
      vigente = false;
    };
    // Recargar sólo si cambia el usuario, no en cada render de la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autenticado, uid]);

  if (estado.tipo === "listo") {
    return (
      <PerfilContext.Provider value={estado.me}>
        {children}
      </PerfilContext.Provider>
    );
  }

  if (estado.tipo === "rol-incorrecto") {
    const destino = INICIO_POR_ROL[estado.me.rol];
    return (
      <PantallaCentrada>
        <Alert>
          <AlertTitle>
            Esta sección no está disponible para tu cuenta
          </AlertTitle>
          <AlertDescription>
            Tu cuenta tiene otro tipo de acceso. Puedes ir a {destino.nombre}.
          </AlertDescription>
        </Alert>
        <Link
          href={destino.ruta}
          className="w-fit text-sm font-medium text-primary underline underline-offset-4"
        >
          Ir a {destino.nombre}
        </Link>
      </PantallaCentrada>
    );
  }

  if (estado.tipo === "error") {
    return (
      <PantallaCentrada>
        <Alert variant="destructive" role="alert">
          <AlertTitle>No pudimos cargar tu cuenta</AlertTitle>
          <AlertDescription>{estado.mensaje}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="w-fit"
          onClick={async () => {
            setEstado({ tipo: "cargando" });
            const siguiente = await cargar();
            if (siguiente) setEstado(siguiente);
          }}
        >
          Reintentar
        </Button>
      </PantallaCentrada>
    );
  }

  return (
    <PantallaCentrada>
      <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
        <span className="sr-only">Cargando tu cuenta…</span>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </PantallaCentrada>
  );
}

function PantallaCentrada({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16">
      {children}
    </main>
  );
}

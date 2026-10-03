"use client";

import { useCallback, useEffect, useState } from "react";
import { mensajeError } from "@/lib/auth/mensajes";

export type Carga<T> =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string }
  | { estado: "listo"; datos: T };

/**
 * Carga datos del BE con estados explícitos de carga, error y éxito. `recargar`
 * repite la petición; las respuestas de una petición vieja se descartan.
 */
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [carga, setCarga] = useState<Carga<T>>({ estado: "cargando" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargar().then(
      (datos) => vigente && setCarga({ estado: "listo", datos }),
      (error: unknown) =>
        vigente && setCarga({ estado: "error", mensaje: mensajeError(error) }),
    );
    return () => {
      vigente = false;
    };
    // `cargar` cambia en cada render; las dependencias reales llegan por `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = useCallback(() => {
    setCarga({ estado: "cargando" });
    setVersion((v) => v + 1);
  }, []);

  return { carga, recargar };
}

import type { Marca } from "@/lib/api/contract";

/** Nombres de marca. Logotipos y fotos reales esperan DEC-11. */
export const NOMBRE_MARCA: Record<Marca, string> = {
  zontes: "Zontes",
  kiden: "Kiden",
  niu: "NIU",
};

const CLAVE = "fidelizacion.marcaActiva";

/**
 * Marca activa: preferencia de presentación del navegador, no un dato de
 * negocio. Sólo es válida si está entre las marcas que confirma el backend.
 */
export function leerMarcaActiva(marcas: Marca[]): Marca | null {
  let guardada: string | null = null;
  try {
    guardada = window.localStorage.getItem(CLAVE);
  } catch {
    // Almacenamiento no disponible: se usa la primera marca.
  }
  const valida = marcas.find((m) => m === guardada);
  return valida ?? marcas[0] ?? null;
}

export function guardarMarcaActiva(marca: Marca): void {
  try {
    window.localStorage.setItem(CLAVE, marca);
  } catch {
    // Sin persistencia: la elección dura mientras la página esté abierta.
  }
}

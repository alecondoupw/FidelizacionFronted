import type { Marca } from "./api/contract";

type Busqueda = Record<string, string | string[] | undefined>;

/**
 * Lectura defensiva de parámetros de URL para filtros iniciales: un valor
 * desconocido se ignora (el backend vuelve a validar todo).
 */
export function leerParametros(q: Busqueda) {
  const texto = (k: string) => (typeof q[k] === "string" ? q[k] : undefined);
  return {
    fecha: (k: string) => {
      const v = texto(k);
      return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
    },
    marca: () => {
      const v = texto("marca");
      return v === "zontes" || v === "kiden" || v === "niu"
        ? (v as Marca)
        : undefined;
    },
    uno: <T extends string>(k: string, validos: readonly T[]) => {
      const v = texto(k);
      return validos.includes(v as T) ? (v as T) : undefined;
    },
  };
}

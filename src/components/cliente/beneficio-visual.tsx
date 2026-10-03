import { BadgePercent, HardHat, Mountain, Shirt, Wrench } from "lucide-react";
import type { Categoria, Disponibilidad, EstadoCanje } from "@/lib/api/canjes";
import { NOMBRE_DISPONIBILIDAD, NOMBRE_ESTADO_CANJE } from "@/lib/formato";
import { cn } from "@/lib/utils";

/** Iconos por categoría en lugar de fotografías hasta resolver DEC-11. */
export const ICONO_CATEGORIA: Record<Categoria, typeof Shirt> = {
  accesorios: HardHat,
  ropa: Shirt,
  servicios: Wrench,
  experiencias: Mountain,
  descuentos: BadgePercent,
};

export function IlustracionBeneficio({
  categoria,
  className,
}: {
  categoria: Categoria;
  className?: string;
}) {
  const Icono = ICONO_CATEGORIA[categoria];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-xl bg-secondary text-primary",
        className,
      )}
    >
      <Icono className="size-1/3 max-h-16 max-w-16" strokeWidth={1.5} />
    </div>
  );
}

const ESTILO_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  disponible: "bg-exito-suave text-exito",
  ultimas: "bg-aviso-suave text-aviso",
  agotado: "bg-destructive/10 text-destructive",
  proximamente: "bg-secondary text-secondary-foreground",
};

export function EtiquetaDisponibilidad({ valor }: { valor: Disponibilidad }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ESTILO_DISPONIBILIDAD[valor],
      )}
    >
      {NOMBRE_DISPONIBILIDAD[valor]}
    </span>
  );
}

const ESTILO_ESTADO: Record<EstadoCanje, string> = {
  emitido: "bg-secondary text-secondary-foreground",
  entregado: "bg-exito-suave text-exito",
  vencido: "bg-aviso-suave text-aviso",
  anulado: "bg-destructive/10 text-destructive",
};

export function EtiquetaEstadoCanje({ valor }: { valor: EstadoCanje }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        ESTILO_ESTADO[valor],
      )}
    >
      {NOMBRE_ESTADO_CANJE[valor]}
    </span>
  );
}

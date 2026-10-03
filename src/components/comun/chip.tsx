import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Botón de filtro con estado presionado accesible (catálogo, reportes, novedades). */
export function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

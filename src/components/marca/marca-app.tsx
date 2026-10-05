import { Bike } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Distintivo de la aplicación. En el sidebar de cliente y administrador dice
 * «Zontes» junto al icono (DEC-20, F9); las pantallas de acceso conservan la
 * identidad de referencia «MOTO LOYALTY» de SRC-04/05. Logotipos reales:
 * DEC-11.
 */
export function MarcaApp({
  className,
  variante = "acceso",
}: {
  className?: string;
  variante?: "acceso" | "sidebar";
}) {
  if (variante === "sidebar") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"
        >
          <Bike className="size-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight text-sidebar-foreground">
          Zontes
        </span>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-foreground text-primary"
      >
        <Bike className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-extrabold tracking-tight whitespace-nowrap">
          MOTO LOYALTY
        </span>
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Fidelización
        </span>
      </span>
    </div>
  );
}

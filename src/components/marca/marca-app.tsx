import { Bike } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Identidad de referencia «MOTO LOYALTY» de los mockups SRC-04/05; la
 * identidad final y sus activos dependen de DEC-11.
 */
export function MarcaApp({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
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

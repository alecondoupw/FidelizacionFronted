import type { ComponentProps } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const CLASE_SELECT =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60 aria-invalid:border-destructive";

/** `select` nativo con etiqueta: accesible por teclado y lector de pantalla en todos los tamaños. */
export function Selector({
  id,
  etiqueta,
  opciones,
  error,
  className,
  ...props
}: ComponentProps<"select"> & {
  id: string;
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(CLASE_SELECT, className)}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

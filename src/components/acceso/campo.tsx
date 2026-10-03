import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Campo de formulario con etiqueta, ayuda y error accesibles. */
export function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  ...props
}: ComponentProps<typeof Input> & {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
}) {
  const descripcion = [ayuda && `${id}-ayuda`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descripcion || undefined}
        className="h-10"
        {...props}
      />
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

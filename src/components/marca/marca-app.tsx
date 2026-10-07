import Image from "next/image";
import { cn } from "@/lib/utils";

/** Distintivo de Zontes compartido por las pantallas de acceso y los sidebars. */
export function MarcaApp({
  className,
  variante = "acceso",
}: {
  className?: string;
  variante?: "acceso" | "sidebar";
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/imagenes/zontesIcon.jpg"
        alt=""
        width={40}
        height={40}
        className="size-10 shrink-0 rounded-xl object-contain"
      />
      {variante === "sidebar" ? (
        <span className="text-lg font-extrabold tracking-tight text-sidebar-foreground">
          Zontes
        </span>
      ) : (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold tracking-tight whitespace-nowrap">
            Zontes
          </span>
          <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Fidelización
          </span>
        </span>
      )}
    </div>
  );
}

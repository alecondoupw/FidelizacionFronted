"use client";

import { LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { MarcaApp } from "@/components/marca/marca-app";
import { useSesion } from "@/lib/auth/sesion";
import { cn } from "@/lib/utils";

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
}

/**
 * Marco común (SRC-03 p. 2, SRC-02 p. 8): barra lateral en escritorio;
 * encabezado compacto y barra inferior en móvil. Sólo lista secciones que
 * existen; la navegación crece con cada fase.
 */
export function Shell({
  items,
  rutaAcceso,
  rolEtiqueta,
  children,
}: {
  items: ItemNavegacion[];
  rutaAcceso: string;
  rolEtiqueta: string;
  children: ReactNode;
}) {
  const sesion = useSesion();
  const router = useRouter();
  const pathname = usePathname();
  const nombre = sesion.usuario?.nombre || sesion.usuario?.correo || "";

  const cerrarSesion = async () => {
    await sesion.cerrarSesion();
    router.replace(`${rutaAcceso}?aviso=sesion-cerrada`);
  };

  const activo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-5 md:flex">
        <MarcaApp />
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
          {items.map(({ href, etiqueta, icono: Icono }) => (
            <Link
              key={href}
              href={href}
              aria-current={activo(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                activo(href) &&
                  "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icono aria-hidden="true" className="size-4.5" />
              {etiqueta}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <LogOut aria-hidden="true" className="size-4.5" />
          Cerrar sesión
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3 md:px-8">
          <MarcaApp className="md:hidden" />
          <div className="ml-auto flex min-w-0 flex-col items-end text-right">
            <span className="max-w-[16rem] truncate text-sm font-semibold">
              {nombre}
            </span>
            <span className="text-xs text-muted-foreground">{rolEtiqueta}</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col px-4 pt-6 pb-24 md:px-8 md:pb-10">
          {children}
        </div>
      </div>

      <nav
        aria-label="Principal móvil"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-card md:hidden"
      >
        {items.map(({ href, etiqueta, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            aria-current={activo(href) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              activo(href) && "text-primary",
            )}
          >
            <Icono aria-hidden="true" className="size-5" />
            {etiqueta}
          </Link>
        ))}
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <LogOut aria-hidden="true" className="size-5" />
          Salir
        </button>
      </nav>
    </div>
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="text-2xl font-extrabold tracking-tight">{titulo}</h1>
      {descripcion && <p className="text-muted-foreground">{descripcion}</p>}
    </div>
  );
}

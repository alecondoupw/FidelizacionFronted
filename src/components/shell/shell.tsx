"use client";

import { LogOut, Menu, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { MarcaApp } from "@/components/marca/marca-app";
import { useSesion } from "@/lib/auth/sesion";
import { cn } from "@/lib/utils";

export interface ItemNavegacion {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Encabezado de sección en la barra lateral (A13); se muestra al cambiar. */
  grupo?: string;
  /** Texto de la barra inferior móvil cuando `etiqueta` no cabe. */
  corta?: string;
}

/**
 * Marco común (SRC-03 p. 2, SRC-02 p. 8): barra lateral en escritorio;
 * barra inferior en móvil. Sólo lista secciones que
 * existen; la navegación crece con cada fase.
 */
export function Shell({
  items,
  rutaAcceso,
  children,
}: {
  items: ItemNavegacion[];
  rutaAcceso: string;
  children: ReactNode;
}) {
  const sesion = useSesion();
  const router = useRouter();
  const pathname = usePathname();

  const cerrarSesion = async () => {
    await sesion.cerrarSesion();
    router.replace(`${rutaAcceso}?aviso=sesion-cerrada`);
  };

  const activo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-5 text-sidebar-foreground md:flex">
        <MarcaApp variante="sidebar" />
        <nav
          aria-label="Principal"
          className="-mx-1 flex flex-1 flex-col gap-1 overflow-y-auto px-1"
        >
          {items.map(({ href, etiqueta, icono: Icono, grupo }, i) => (
            <Fragment key={href}>
              {grupo && grupo !== items[i - 1]?.grupo && (
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-muted uppercase first:pt-0">
                  {grupo}
                </p>
              )}
              <Link
                href={href}
                aria-current={activo(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none",
                  activo(href) &&
                    "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icono aria-hidden="true" className="size-4.5" />
                {etiqueta}
              </Link>
            </Fragment>
          ))}
        </nav>
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <LogOut aria-hidden="true" className="size-4.5" />
          Cerrar sesión
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col px-4 pt-6 pb-24 md:px-8 md:pb-10">
          {children}
        </div>
      </div>

      <BarraMovil items={items} activo={activo} cerrarSesion={cerrarSesion} />
    </div>
  );
}

const VISIBLES_MOVIL = 4;
const CLASE_BOTON_MOVIL =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-sidebar-muted focus-visible:ring-3 focus-visible:ring-sidebar-ring focus-visible:outline-none focus-visible:ring-inset";

/**
 * Barra inferior móvil: las primeras secciones y un menú "Más" con el resto
 * y el cierre de sesión, para que cada destino conserve un área táctil útil.
 */
function BarraMovil({
  items,
  activo,
  cerrarSesion,
}: {
  items: ItemNavegacion[];
  activo: (href: string) => boolean;
  cerrarSesion: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const visibles =
    items.length > VISIBLES_MOVIL + 1 ? items.slice(0, VISIBLES_MOVIL) : items;
  const resto = items.slice(visibles.length);
  const restoActivo = resto.some((i) => activo(i.href));

  // Al navegar, el menú se cierra.
  const [rutaPrevia, setRutaPrevia] = useState(pathname);
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname);
    setAbierto(false);
  }

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) =>
      e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <div className="md:hidden">
      {abierto && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-10 bg-black/20"
            onClick={() => setAbierto(false)}
          />
          <div
            id="menu-mas"
            className="fixed inset-x-3 bottom-17 z-20 flex max-h-[calc(100dvh-6rem)] flex-col gap-1 overflow-y-auto rounded-2xl border bg-card p-2 shadow-lg"
          >
            {resto.map(({ href, etiqueta, icono: Icono }) => (
              <Link
                key={href}
                href={href}
                aria-current={activo(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  activo(href) &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Icono aria-hidden="true" className="size-5" />
                {etiqueta}
              </Link>
            ))}
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <LogOut aria-hidden="true" className="size-5" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
      <nav
        aria-label="Principal móvil"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-sidebar-border bg-sidebar"
      >
        {visibles.map(({ href, etiqueta, corta, icono: Icono }) => (
          <Link
            key={href}
            href={href}
            aria-current={activo(href) ? "page" : undefined}
            aria-label={corta ? etiqueta : undefined}
            className={cn(
              CLASE_BOTON_MOVIL,
              activo(href) && "font-bold text-sidebar-primary",
            )}
          >
            <Icono aria-hidden="true" className="size-5" />
            {corta ?? etiqueta}
          </Link>
        ))}
        {resto.length > 0 ? (
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls="menu-mas"
            onClick={() => setAbierto((a) => !a)}
            className={cn(
              CLASE_BOTON_MOVIL,
              (abierto || restoActivo) && "font-bold text-sidebar-primary",
            )}
          >
            <Menu aria-hidden="true" className="size-5" />
            Más
          </button>
        ) : (
          <button
            type="button"
            onClick={cerrarSesion}
            className={CLASE_BOTON_MOVIL}
          >
            <LogOut aria-hidden="true" className="size-5" />
            Salir
          </button>
        )}
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

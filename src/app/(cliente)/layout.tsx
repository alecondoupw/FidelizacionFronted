"use client";

import {
  Gift,
  History,
  House,
  Layers,
  Megaphone,
  Tags,
  Ticket,
  UserRound,
} from "lucide-react";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Shell, type ItemNavegacion } from "@/components/shell/shell";

/**
 * Secciones del área cliente en el orden de SRC-03 p. 2; F9 (DEC-20) añade
 * «Novedades» (UI-28) como destino persistente.
 */
const ITEMS: ItemNavegacion[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: House },
  { href: "/puntos", etiqueta: "Mis puntos", icono: Layers },
  { href: "/catalogo", etiqueta: "Catálogo", icono: Gift },
  { href: "/canjes", etiqueta: "Mis canjes", icono: Ticket },
  { href: "/historial", etiqueta: "Historial", icono: History },
  { href: "/marcas", etiqueta: "Mis marcas", icono: Tags },
  { href: "/novedades", etiqueta: "Novedades", icono: Megaphone },
  { href: "/perfil", etiqueta: "Mi perfil", icono: UserRound },
];

export default function ClienteLayout({ children }: LayoutProps<"/">) {
  return (
    <GuardiaRol rol="cliente" rutaAcceso="/ingresar">
      <Shell items={ITEMS} rutaAcceso="/ingresar">
        {children}
      </Shell>
    </GuardiaRol>
  );
}

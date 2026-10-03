"use client";

import {
  Gift,
  History,
  House,
  Layers,
  Tags,
  Ticket,
  UserRound,
} from "lucide-react";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Shell, type ItemNavegacion } from "@/components/shell/shell";

/** Secciones construidas del área cliente, en el orden de SRC-03 p. 2. */
const ITEMS: ItemNavegacion[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: House },
  { href: "/puntos", etiqueta: "Mis puntos", icono: Layers },
  { href: "/catalogo", etiqueta: "Catálogo", icono: Gift },
  { href: "/canjes", etiqueta: "Mis canjes", icono: Ticket },
  { href: "/historial", etiqueta: "Historial", icono: History },
  { href: "/marcas", etiqueta: "Mis marcas", icono: Tags },
  { href: "/perfil", etiqueta: "Mi perfil", icono: UserRound },
];

export default function ClienteLayout({ children }: LayoutProps<"/">) {
  return (
    <GuardiaRol rol="cliente" rutaAcceso="/ingresar">
      <Shell items={ITEMS} rutaAcceso="/ingresar" rolEtiqueta="Cliente">
        {children}
      </Shell>
    </GuardiaRol>
  );
}

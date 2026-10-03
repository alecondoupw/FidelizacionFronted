"use client";

import { History, House, Layers, Tags, UserRound } from "lucide-react";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Shell, type ItemNavegacion } from "@/components/shell/shell";

/** Secciones construidas del área cliente; crecen con F2–F3 (SRC-03 p. 2). */
const ITEMS: ItemNavegacion[] = [
  { href: "/inicio", etiqueta: "Inicio", icono: House },
  { href: "/puntos", etiqueta: "Mis puntos", icono: Layers },
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

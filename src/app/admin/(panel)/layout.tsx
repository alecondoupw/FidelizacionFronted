"use client";

import { UserRound } from "lucide-react";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Shell, type ItemNavegacion } from "@/components/shell/shell";

/** Secciones construidas del panel; crecen con F2 y F4–F6 (SRC-02 p. 8). */
const ITEMS: ItemNavegacion[] = [
  { href: "/admin/perfil", etiqueta: "Mi perfil", icono: UserRound },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="tema-admin flex flex-1 flex-col bg-background">
      <GuardiaRol rol="administrador" rutaAcceso="/admin/ingresar">
        <Shell
          items={ITEMS}
          rutaAcceso="/admin/ingresar"
          rolEtiqueta="Administrador"
        >
          {children}
        </Shell>
      </GuardiaRol>
    </div>
  );
}

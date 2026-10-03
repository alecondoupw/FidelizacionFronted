"use client";

import {
  Gift,
  Hourglass,
  PlusCircle,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Shell, type ItemNavegacion } from "@/components/shell/shell";

/** Secciones construidas del panel, en el orden de A03; crecen con F5–F6 (SRC-02 p. 8). */
const ITEMS: ItemNavegacion[] = [
  { href: "/admin/clientes", etiqueta: "Clientes", icono: Users },
  {
    href: "/admin/administradores",
    etiqueta: "Administradores",
    icono: ShieldCheck,
  },
  {
    href: "/admin/reglas",
    etiqueta: "Reglas de puntos",
    icono: SlidersHorizontal,
  },
  { href: "/admin/vencimiento", etiqueta: "Vencimiento", icono: Hourglass },
  { href: "/admin/registrar", etiqueta: "Registrar puntos", icono: PlusCircle },
  { href: "/admin/beneficios", etiqueta: "Beneficios", icono: Gift },
  { href: "/admin/canjes", etiqueta: "Canjes", icono: Ticket },
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

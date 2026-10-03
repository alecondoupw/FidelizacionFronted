"use client";

import {
  Activity,
  Download,
  Gift,
  Hourglass,
  LayoutDashboard,
  List,
  PlusCircle,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  UserRound,
  Users,
  BarChart3,
} from "lucide-react";
import { GuardiaRol } from "@/components/acceso/guardia-rol";
import { Shell, type ItemNavegacion } from "@/components/shell/shell";

/** Secciones del panel agrupadas como en A13 (SRC-02 p. 8); F6 suma Contenido. */
const ITEMS: ItemNavegacion[] = [
  {
    href: "/admin/dashboard",
    etiqueta: "Dashboard",
    icono: LayoutDashboard,
    grupo: "Principal",
  },
  {
    href: "/admin/clientes",
    etiqueta: "Clientes",
    icono: Users,
    grupo: "Usuarios",
  },
  {
    href: "/admin/administradores",
    etiqueta: "Administradores",
    icono: ShieldCheck,
    grupo: "Usuarios",
  },
  {
    href: "/admin/reglas",
    etiqueta: "Reglas de puntos",
    icono: SlidersHorizontal,
    grupo: "Fidelización",
  },
  {
    href: "/admin/vencimiento",
    etiqueta: "Vencimiento",
    icono: Hourglass,
    grupo: "Fidelización",
  },
  {
    href: "/admin/registrar",
    etiqueta: "Registrar puntos",
    icono: PlusCircle,
    grupo: "Fidelización",
  },
  {
    href: "/admin/movimientos",
    etiqueta: "Movimientos",
    icono: List,
    grupo: "Fidelización",
  },
  {
    href: "/admin/beneficios",
    etiqueta: "Beneficios",
    icono: Gift,
    grupo: "Fidelización",
  },
  {
    href: "/admin/canjes",
    etiqueta: "Canjes en mostrador",
    icono: Ticket,
    grupo: "Fidelización",
  },
  {
    href: "/admin/actividad",
    etiqueta: "Actividad",
    icono: Activity,
    grupo: "Análisis",
  },
  {
    href: "/admin/tendencias",
    etiqueta: "Tendencias",
    icono: TrendingUp,
    grupo: "Análisis",
  },
  {
    href: "/admin/reporte-canjes",
    etiqueta: "Reporte de canjes",
    icono: BarChart3,
    grupo: "Análisis",
  },
  {
    href: "/admin/exportar",
    etiqueta: "Exportar datos",
    icono: Download,
    grupo: "Análisis",
  },
  {
    href: "/admin/perfil",
    etiqueta: "Mi perfil",
    icono: UserRound,
    grupo: "Cuenta",
  },
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

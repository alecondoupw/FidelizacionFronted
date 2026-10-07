import Link from "next/link";

export type RolAcceso = "cliente" | "administrador";

const ACCESOS = {
  cliente: {
    etiqueta: "Cliente",
    nombre: "Ingresar como cliente",
    href: "/ingresar",
    icono: "/imagenes/acceso-cliente-v2.png",
  },
  administrador: {
    etiqueta: "Admin",
    nombre: "Ingresar como administrador",
    href: "/admin/ingresar",
    icono: "/imagenes/acceso-admin-v2.png",
  },
} as const;

/** Un único acceso al ingreso del otro rol; los permisos viven en el servidor. */
export function SelectorAcceso({ actual }: { actual: RolAcceso }) {
  const destino = ACCESOS[actual === "cliente" ? "administrador" : "cliente"];

  return (
    <nav aria-label="Tipo de acceso" className="shrink-0">
      <Link
        href={destino.href}
        aria-label={destino.nombre}
        title={destino.nombre}
        className="group flex flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-black ring-2 ring-transparent ring-offset-2 ring-offset-background transition-shadow group-hover:ring-[var(--zontes-lima)]">
          <span
            aria-hidden="true"
            className="size-8 bg-[var(--zontes-lima)]"
            style={{
              maskImage: `url("${destino.icono}")`,
              maskSize: "contain",
              maskPosition: "center",
              maskRepeat: "no-repeat",
            }}
          />
        </span>
        <span className="text-xs leading-none text-muted-foreground">
          {destino.etiqueta}
        </span>
      </Link>
    </nav>
  );
}

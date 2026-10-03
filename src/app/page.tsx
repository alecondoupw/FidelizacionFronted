import Link from "next/link";

/**
 * Página técnica de F0. No representa ninguna vista de producto (UI-01…UI-23);
 * las vistas reales se construyen desde F1 con su UI-ID y contrato.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium text-muted-foreground">
        F0 · base técnica
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Fidelización Zontes · Kiden · NIU
      </h1>
      <p className="text-muted-foreground">
        Frontend Next.js instalado. Esta página no es una pantalla del producto:
        las vistas de cliente y administrador se implementan por fases según el
        mapa de vistas.
      </p>
      <Link
        href="/diagnostico"
        className="w-fit text-sm font-medium underline underline-offset-4"
      >
        Diagnóstico de conexión con el backend
      </Link>
    </main>
  );
}

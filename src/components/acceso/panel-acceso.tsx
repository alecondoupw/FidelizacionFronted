import type { ReactNode } from "react";
import { MarcaApp } from "@/components/marca/marca-app";
import { NOMBRE_MARCA } from "@/lib/marcas";

/**
 * Marco de las pantallas de acceso (C10 como referencia de composición).
 * Sin fotografías ni logotipos de los mockups hasta resolver DEC-11.
 */
export function PanelAcceso({
  children,
  pie,
  admin = false,
}: {
  children: ReactNode;
  pie?: ReactNode;
  admin?: boolean;
}) {
  return (
    <div
      className={admin ? "tema-admin flex flex-1 bg-background" : "flex flex-1"}
    >
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:py-10 lg:grid-cols-[1fr_1.1fr]">
        <section
          aria-label="Presentación"
          className="hidden flex-col justify-between gap-10 rounded-2xl bg-secondary p-10 lg:flex"
        >
          <MarcaApp />
          {admin ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-4xl font-extrabold tracking-tight text-balance">
                Panel de administración
              </h2>
              <p className="max-w-md text-lg text-muted-foreground">
                Acceso exclusivo para administradores creados por otro
                administrador. No hay registro público.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h2 className="text-4xl font-extrabold tracking-tight text-balance">
                Una sola cuenta para todas tus marcas
              </h2>
              <p className="max-w-md text-lg text-muted-foreground">
                Acumula y consulta tus beneficios de{" "}
                {Object.values(NOMBRE_MARCA)
                  .join(", ")
                  .replace(/, (?=[^,]*$)/, " y ")}{" "}
                desde un mismo perfil.
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {admin
              ? "Las acciones se verifican siempre en el servidor."
              : "Si ya eres cliente, tus marcas se vinculan automáticamente por tu correo."}
          </p>
        </section>
        <section className="flex flex-col justify-center gap-6">
          <MarcaApp className="lg:hidden" />
          <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
            {children}
          </div>
          {pie}
        </section>
      </main>
    </div>
  );
}

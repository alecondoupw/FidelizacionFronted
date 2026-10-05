import Image from "next/image";
import type { ReactNode } from "react";
import { MarcaApp } from "@/components/marca/marca-app";
import { NOMBRE_MARCA } from "@/lib/marcas";

/** Imagen vertical del panel visual (F9-R03/R04, 1086×1448, DEC-22). */
export interface ImagenAcceso {
  src: string;
  /** La frase integrada en la imagen no se repite en HTML: va en el alt. */
  alt: string;
}

/**
 * Marco de las pantallas de acceso (C10 como referencia de composición).
 * Las pantallas de cliente muestran su imagen (F9, DEC-22) en el panel visual
 * contiguo al formulario: en escritorio en dos columnas y en tablet/móvil
 * antes del formulario, completa y sin recortes. El acceso de administración
 * conserva su panel de texto.
 */
export function PanelAcceso({
  children,
  pie,
  admin = false,
  imagen,
}: {
  children: ReactNode;
  pie?: ReactNode;
  admin?: boolean;
  imagen?: ImagenAcceso;
}) {
  return (
    <div
      className={admin ? "tema-admin flex flex-1 bg-background" : "flex flex-1"}
    >
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 md:py-10 lg:grid-cols-[1fr_1.1fr]">
        {imagen ? (
          <section
            aria-label="Presentación"
            className="flex justify-center lg:items-center"
          >
            <Image
              src={imagen.src}
              alt={imagen.alt}
              width={1086}
              height={1448}
              sizes="(min-width: 1024px) 34rem, 17rem"
              loading="eager"
              fetchPriority="high"
              className="h-auto w-full max-w-[17rem] rounded-2xl shadow-sm ring-1 ring-border sm:max-w-[19rem] lg:max-w-none"
            />
          </section>
        ) : (
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
        )}
        <section className="flex flex-col justify-center gap-6">
          <MarcaApp className={imagen ? undefined : "lg:hidden"} />
          <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border sm:p-8">
            {children}
          </div>
          {pie}
        </section>
      </main>
    </div>
  );
}

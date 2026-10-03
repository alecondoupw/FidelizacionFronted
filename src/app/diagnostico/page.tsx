import type { Metadata } from "next";
import { HealthCheck } from "./health-check";

export const metadata: Metadata = {
  title: "Diagnóstico técnico · Fidelización",
  robots: { index: false, follow: false },
};

export default function DiagnosticoPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          F0 · prueba técnica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Conexión frontend → backend
        </h1>
        <p className="text-muted-foreground">
          El navegador llama al endpoint de salud de Express sin token ni datos
          personales.
        </p>
      </div>
      <HealthCheck />
    </main>
  );
}

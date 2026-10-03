import type { Metadata } from "next";
import { ReglasPuntos } from "@/components/admin/reglas";

export const metadata: Metadata = {
  title: "Reglas de puntos · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ReglasPuntos />;
}

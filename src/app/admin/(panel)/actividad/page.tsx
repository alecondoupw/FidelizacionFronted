import type { Metadata } from "next";
import { ActividadAdmin } from "@/components/admin/actividad";

export const metadata: Metadata = {
  title: "Actividad · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ActividadAdmin />;
}

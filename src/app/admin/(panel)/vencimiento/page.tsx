import type { Metadata } from "next";
import { VencimientoPuntos } from "@/components/admin/vencimiento";

export const metadata: Metadata = {
  title: "Vencimiento · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VencimientoPuntos />;
}

import type { Metadata } from "next";
import { ContenidoAdmin } from "@/components/admin/contenido";

export const metadata: Metadata = {
  title: "Contenido por marca · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ContenidoAdmin />;
}

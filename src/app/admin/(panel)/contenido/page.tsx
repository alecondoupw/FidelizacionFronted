import type { Metadata } from "next";
import { ContenidoAdmin } from "@/components/admin/contenido";

export const metadata: Metadata = {
  title: "Publicaciones por marca · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ContenidoAdmin />;
}

import type { Metadata } from "next";
import { MisMarcas } from "@/components/cliente/mis-marcas";

export const metadata: Metadata = { title: "Mis marcas · Zontes" };

export default function MarcasPage() {
  return <MisMarcas />;
}

import type { Metadata } from "next";
import { MisPuntos } from "@/components/cliente/mis-puntos";

export const metadata: Metadata = { title: "Mis puntos · Zontes" };

export default function Page() {
  return <MisPuntos />;
}

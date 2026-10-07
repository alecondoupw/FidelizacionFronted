import type { Metadata } from "next";
import { Historial } from "@/components/cliente/historial";

export const metadata: Metadata = { title: "Historial · Zontes" };

export default function Page() {
  return <Historial />;
}

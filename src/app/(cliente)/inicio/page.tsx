import type { Metadata } from "next";
import { Inicio } from "@/components/cliente/inicio";

export const metadata: Metadata = { title: "Inicio · MOTO LOYALTY" };

export default function Page() {
  return <Inicio />;
}

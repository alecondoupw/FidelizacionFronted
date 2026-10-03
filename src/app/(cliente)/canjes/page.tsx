import type { Metadata } from "next";
import { MisCanjes } from "@/components/cliente/mis-canjes";

export const metadata: Metadata = { title: "Mis canjes · MOTO LOYALTY" };

export default function Page() {
  return <MisCanjes />;
}

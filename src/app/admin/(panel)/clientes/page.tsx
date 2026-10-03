import type { Metadata } from "next";
import { Clientes } from "@/components/admin/clientes";

export const metadata: Metadata = {
  title: "Clientes · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Clientes />;
}

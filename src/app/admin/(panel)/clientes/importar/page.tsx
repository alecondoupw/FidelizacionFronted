import type { Metadata } from "next";
import { ImportarClientes } from "@/components/admin/importar-clientes";

export const metadata: Metadata = {
  title: "Importar clientes · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ImportarClientes />;
}

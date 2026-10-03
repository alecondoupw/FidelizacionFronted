import type { Metadata } from "next";
import { DetalleClienteAdmin } from "@/components/admin/detalle-cliente";

export const metadata: Metadata = {
  title: "Cliente · Administración",
  robots: { index: false, follow: false },
};

export default async function Page(props: PageProps<"/admin/clientes/[uid]">) {
  const { uid } = await props.params;
  return <DetalleClienteAdmin key={uid} uid={decodeURIComponent(uid)} />;
}

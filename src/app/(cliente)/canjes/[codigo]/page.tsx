import type { Metadata } from "next";
import { DetalleCanje } from "@/components/cliente/detalle-canje";

export const metadata: Metadata = { title: "Detalle del canje · MOTO LOYALTY" };

export default async function Page(props: PageProps<"/canjes/[codigo]">) {
  const { codigo } = await props.params;
  return <DetalleCanje key={codigo} codigo={decodeURIComponent(codigo)} />;
}

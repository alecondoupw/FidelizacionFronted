import type { Metadata } from "next";
import { DetalleBeneficio } from "@/components/cliente/detalle-beneficio";

export const metadata: Metadata = { title: "Beneficio · Zontes" };

export default async function Page(props: PageProps<"/catalogo/[id]">) {
  const { id } = await props.params;
  return <DetalleBeneficio key={id} id={id} />;
}

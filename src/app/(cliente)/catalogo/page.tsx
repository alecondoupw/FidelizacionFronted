import type { Metadata } from "next";
import { Catalogo } from "@/components/cliente/catalogo";

export const metadata: Metadata = { title: "Catálogo · MOTO LOYALTY" };

export default async function Page(props: PageProps<"/catalogo">) {
  const { marca } = await props.searchParams;
  return (
    <Catalogo marcaInicial={typeof marca === "string" ? marca : undefined} />
  );
}

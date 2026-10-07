import type { Metadata } from "next";
import { Catalogo } from "@/components/cliente/catalogo";

export const metadata: Metadata = { title: "Catálogo · Zontes" };

export default async function Page(props: PageProps<"/catalogo">) {
  const { marca, q } = await props.searchParams;
  return (
    <Catalogo
      marcaInicial={typeof marca === "string" ? marca : undefined}
      busquedaInicial={typeof q === "string" ? q.slice(0, 80) : undefined}
    />
  );
}

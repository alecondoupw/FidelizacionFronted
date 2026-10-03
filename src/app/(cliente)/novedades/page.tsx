import type { Metadata } from "next";
import { Novedades } from "@/components/cliente/novedades";

export const metadata: Metadata = { title: "Novedades · MOTO LOYALTY" };

export default async function Page(props: PageProps<"/novedades">) {
  const { marca } = await props.searchParams;
  const inicial = typeof marca === "string" ? marca : undefined;
  return <Novedades key={inicial ?? "todas"} marcaInicial={inicial} />;
}

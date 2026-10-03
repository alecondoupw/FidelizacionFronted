import type { Metadata } from "next";
import { Administradores } from "@/components/admin/administradores";

export const metadata: Metadata = {
  title: "Administradores · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Administradores />;
}

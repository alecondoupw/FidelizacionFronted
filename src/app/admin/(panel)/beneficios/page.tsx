import type { Metadata } from "next";
import { BeneficiosAdmin } from "@/components/admin/beneficios";

export const metadata: Metadata = {
  title: "Beneficios · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BeneficiosAdmin />;
}

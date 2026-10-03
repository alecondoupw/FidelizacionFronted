import type { Metadata } from "next";
import { TendenciasAdmin } from "@/components/admin/tendencias";

export const metadata: Metadata = {
  title: "Tendencias · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <TendenciasAdmin />;
}

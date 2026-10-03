import type { Metadata } from "next";
import { CanjesAdmin } from "@/components/admin/canjes-admin";

export const metadata: Metadata = {
  title: "Canjes · Administración",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CanjesAdmin />;
}

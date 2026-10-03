import { redirect } from "next/navigation";

/** La entrada pública es el acceso de clientes (UI-02). */
export default function Home() {
  redirect("/ingresar");
}

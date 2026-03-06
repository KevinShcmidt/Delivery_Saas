import { redirect } from "next/navigation";

export default function RootPage() {
  // Redirige immédiatement vers /login
  redirect("/login");
}
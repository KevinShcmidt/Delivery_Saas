/**
 * app/couriers/new/page.tsx
 * Dark mode — style FleetOps
 */

import { CourierForm } from "@/modules/couriers/components/CourierForm";
import Link from "next/link";

export const metadata = { title: "Nouveau livreur | FleetOps" };

export default function NewCourierPage() {
  return (
    <div className="space-y-6 max-w-2xl">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/couriers" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          Livreurs
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">Nouveau</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Nouveau livreur</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Créez un compte livreur — il pourra se connecter immédiatement.
        </p>
      </div>

      {/* Formulaire */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="h-0.5 w-full bg-indigo-500" />
        <div className="p-6">
          <CourierForm mode="create" />
        </div>
      </div>
    </div>
  );
}
/**
 * app/couriers/[id]/not-found.tsx
 * Dark mode — style FleetOps
 */

import Link from "next/link";

export default function CourierNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <span className="text-6xl opacity-30">🏍️</span>
      <h2 className="text-xl font-bold text-zinc-200">Livreur introuvable</h2>
      <p className="text-zinc-500 text-sm">Ce livreur n'existe pas ou a été supprimé.</p>
      <Link
        href="/couriers"
        className="mt-2 px-4 py-2 text-sm font-medium text-indigo-400 border border-indigo-800/50 bg-indigo-950/30 hover:bg-indigo-950/60 rounded-lg transition-all"
      >
        ← Retour à la liste
      </Link>
    </div>
  );
}
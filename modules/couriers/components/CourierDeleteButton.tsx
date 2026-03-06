/**
 * modules/couriers/components/courier-detail/CourierDeleteButton.tsx
 * Dark mode — style FleetOps
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCourierAction } from "@/modules/couriers/actions/courier.actions";

interface CourierDeleteButtonProps {
  courierId: string;
  profileId: string;
  courierName: string;
}

export function CourierDeleteButton({ courierId, profileId, courierName }: CourierDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `⚠️ Supprimer ${courierName} ?\n\nCette action est IRRÉVERSIBLE :\n• Livreur retiré de la plateforme\n• Profil supprimé\n• Compte de connexion supprimé\n\nContinuer ?`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCourierAction(courierId, profileId);
      if (!result.success) {
        alert(`Erreur : ${result.error}`);
        return;
      }
      router.push("/couriers");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="px-4 py-2 text-sm font-medium text-red-400 border border-red-800/50 bg-red-950/30 hover:bg-red-950/60 hover:border-red-700/50 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <span className="w-3.5 h-3.5 border-2 border-red-700 border-t-red-400 rounded-full animate-spin" />
      ) : "🗑️"}
      {isPending ? "Suppression..." : "Supprimer"}
    </button>
  );
}
/**
 * modules/couriers/components/courier-detail/CourierToggleActiveButton.tsx
 * Dark mode — style FleetOps
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCourierActiveAction } from "@/modules/couriers/actions/courier.actions";

interface CourierToggleActiveButtonProps {
  courierId: string;
  profileId: string;
  isActive: boolean;
  courierName: string;
}

export function CourierToggleActiveButton({
  courierId,
  profileId,
  isActive,
  courierName,
}: CourierToggleActiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const action = isActive ? "désactiver" : "activer";
    const confirmed = window.confirm(
      `${isActive ? "⚠️ Désactiver" : "✅ Activer"} le compte de ${courierName} ?`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await toggleCourierActiveAction(courierId, profileId, !isActive);
      if (!result.success) {
        alert(`Erreur : ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={[
        "px-4 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isActive
          ? "text-red-400 border-red-800/50 bg-red-950/30 hover:bg-red-950/60 hover:border-red-700/50"
          : "text-emerald-400 border-emerald-800/50 bg-emerald-950/30 hover:bg-emerald-950/60 hover:border-emerald-700/50",
      ].join(" ")}
    >
      {isPending ? (
        <span className={["w-3.5 h-3.5 border-2 rounded-full animate-spin", isActive ? "border-red-700 border-t-red-400" : "border-emerald-700 border-t-emerald-400"].join(" ")} />
      ) : (
        <span>{isActive ? "🔴" : "🟢"}</span>
      )}
      {isActive ? "Désactiver" : "Activer"}
    </button>
  );
}
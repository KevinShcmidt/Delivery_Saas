/**
 * modules/couriers/components/courier-list/CourierFiltersBar.tsx
 * Dark mode — style FleetOps
 */

"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { COURIER_STATUS_LABELS, VEHICLE_TYPE_LABELS } from "@/core/types";
import type { CourierStatus, VehicleType } from "@/core/types";

export function CourierFiltersBar() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentStatus  = searchParams.get("status")  ?? "all";
  const currentVehicle = searchParams.get("vehicle") ?? "all";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const statusOptions: Array<{ value: CourierStatus | "all"; label: string }> = [
    { value: "all",       label: "Tous les statuts"   },
    { value: "available", label: COURIER_STATUS_LABELS.available },
    { value: "busy",      label: COURIER_STATUS_LABELS.busy      },
    { value: "offline",   label: COURIER_STATUS_LABELS.offline   },
  ];

  const vehicleOptions: Array<{ value: VehicleType | "all"; label: string }> = [
    { value: "all",        label: "Tous les véhicules"        },
    { value: "bike",       label: VEHICLE_TYPE_LABELS.bike       },
    { value: "motorcycle", label: VEHICLE_TYPE_LABELS.motorcycle },
    { value: "car",        label: VEHICLE_TYPE_LABELS.car        },
    { value: "truck",      label: VEHICLE_TYPE_LABELS.truck      },
  ];

  const hasActiveFilters = currentStatus !== "all" || currentVehicle !== "all";
  const selectClass = "text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors hover:border-zinc-600 cursor-pointer";

  return (
    <div className={["flex flex-wrap items-center gap-3 transition-opacity", isPending ? "opacity-50 pointer-events-none" : ""].join(" ")}>
      {/* Filtre statut */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">
          Statut
        </label>
        <select value={currentStatus} onChange={(e) => updateFilter("status", e.target.value)} className={selectClass}>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Séparateur */}
      <div className="w-px h-5 bg-zinc-700" aria-hidden="true" />

      {/* Filtre véhicule */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider whitespace-nowrap">
          Véhicule
        </label>
        <select value={currentVehicle} onChange={(e) => updateFilter("vehicle", e.target.value)} className={selectClass}>
          {vehicleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {isPending && (
        <span className="text-xs text-zinc-500 animate-pulse">Chargement...</span>
      )}

      {hasActiveFilters && !isPending && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname))}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
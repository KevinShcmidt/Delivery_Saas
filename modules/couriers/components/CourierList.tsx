/**
 * modules/couriers/components/courier-list/CourierList.tsx
 */

import Link    from "next/link";
import { Bike, ChevronRight, ChevronLeft } from "lucide-react";
import {
  getCourierDisplayName,
  getVehicleLabel,
  formatCourierRating,
  formatLastLocationTime,
} from "@/core/entities/courier.entity";
import type { CourierWithActiveOrders } from "@/modules/couriers/queries/courier.queries";
import { CourierStatusBadge } from "./CourierStatusBadge";
import { VehicleLabel } from "@/components/shared/VehicleLabel";

interface CourierListProps {
  couriers:    CourierWithActiveOrders[];
  totalCount:  number;
  currentPage: number;
  totalPages:  number;
}

export function CourierList({ couriers, totalCount, currentPage, totalPages }: CourierListProps) {
  if (couriers.length === 0) {
    return (
      <div className="bg-gray-900 border border-white/10 rounded-xl p-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <Bike className="w-7 h-7 text-zinc-600" />
        </div>
        <p className="text-zinc-400 font-medium">Aucun livreur trouvé</p>
        <p className="text-zinc-600 text-sm mt-1">Modifiez vos filtres ou ajoutez un premier livreur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compteur */}
      <p className="text-xs text-zinc-500 uppercase tracking-wider">
        <span className="text-zinc-200 font-semibold text-sm normal-case">{totalCount}</span>
        {" "}livreur{totalCount > 1 ? "s" : ""}
      </p>

      {/* Tableau */}
      <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Livreur</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Statut</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Véhicule</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">En cours</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Note</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Position</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {couriers.map((courier) => (
                <CourierRow key={courier.id} courier={courier} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}

function CourierRow({ courier }: { courier: CourierWithActiveOrders }) {
  const displayName = getCourierDisplayName(courier);
  const isInactive  = !courier.profile.is_active;

  return (
    <tr className={["group transition-colors hover:bg-zinc-800/40", isInactive ? "opacity-50" : ""].join(" ")}>
      {/* Livreur */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {courier.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={courier.profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-400 font-semibold text-xs">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-zinc-100 leading-tight">
              {displayName}
              {isInactive && <span className="ml-2 text-xs text-red-400 font-normal">(désactivé)</span>}
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">{courier.profile.email}</p>
          </div>
        </div>
      </td>

      {/* Statut */}
      <td className="px-5 py-4">
        <CourierStatusBadge status={courier.status} size="sm" />
      </td>

      {/* Véhicule */}
      <td className="px-5 py-4">
        <span className="text-zinc-300"><VehicleLabel type={courier.vehicle_type} /></span>
        {courier.vehicle_plate && (
          <p className="text-zinc-600 text-xs font-mono mt-0.5">{courier.vehicle_plate}</p>
        )}
      </td>

      {/* En cours */}
      <td className="px-5 py-4">
        <span className={["font-semibold tabular-nums", courier.activeOrdersCount > 0 ? "text-orange-400" : "text-zinc-500"].join(" ")}>
          {courier.activeOrdersCount > 0 ? `${courier.activeOrdersCount} en cours` : "—"}
        </span>
      </td>

      {/* Note */}
      <td className="px-5 py-4 text-zinc-300">{formatCourierRating(courier.rating)}</td>

      {/* Position */}
      <td className="px-5 py-4 text-zinc-500 text-xs">{formatLastLocationTime(courier.last_location_at)}</td>

      {/* Actions */}
      <td className="px-5 py-4 text-right">
        <Link
          href={`/couriers/${courier.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg transition-all"
        >
          Voir
          <ChevronRight className="w-3 h-3" />
        </Link>
      </td>
    </tr>
  );
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const btnBase     = "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1";
  const btnActive   = "text-zinc-300 bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600";
  const btnDisabled = "text-zinc-600 bg-zinc-900 border-zinc-800 cursor-not-allowed";

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-zinc-500">
        Page <span className="text-zinc-300">{currentPage}</span> sur <span className="text-zinc-300">{totalPages}</span>
      </p>
      <div className="flex gap-2">
        {currentPage > 1 ? (
          <Link href={`?page=${currentPage - 1}`} className={[btnBase, btnActive].join(" ")}>
            <ChevronLeft className="w-3 h-3" /> Précédent
          </Link>
        ) : (
          <span className={[btnBase, btnDisabled].join(" ")}>
            <ChevronLeft className="w-3 h-3" /> Précédent
          </span>
        )}
        {currentPage < totalPages ? (
          <Link href={`?page=${currentPage + 1}`} className={[btnBase, btnActive].join(" ")}>
            Suivant <ChevronRight className="w-3 h-3" />
          </Link>
        ) : (
          <span className={[btnBase, btnDisabled].join(" ")}>
            Suivant <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </div>
  );
}
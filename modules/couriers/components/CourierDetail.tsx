/**
 * modules/couriers/components/courier-detail/CourierDetail.tsx
 */

import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  getCourierDisplayName,
  getVehicleLabel,
  formatCourierLocation,
  formatLastLocationTime,
  formatCourierRating,
} from "@/core/entities/courier.entity";
import { CourierToggleActiveButton } from "./CourierToggleActiveButton";
import { CourierDeleteButton }       from "./CourierDeleteButton";
import type { CourierWithProfile }   from "@/core/types";
import { CourierStatusBadge }        from "./CourierStatusBadge";
import { CourierStatsCard }          from "./CourierStatsCard";

interface CourierDetailProps {
  courier: CourierWithProfile;
}

export function CourierDetail({ courier }: CourierDetailProps) {
  const displayName = getCourierDisplayName(courier);
  const isInactive  = !courier.profile.is_active;

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/couriers" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          Livreurs
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-zinc-300">{displayName}</span>
      </nav>

      {/* Header card */}
      <div className="bg-gray-900 border-white/10 rounded-xl border overflow-hidden">
        <div className={["h-1 w-full", isInactive ? "bg-red-500/60" : "bg-indigo-500"].join(" ")} />

        <div className="p-6 flex flex-wrap items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {courier.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={courier.profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-indigo-400 font-bold text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-zinc-100">{displayName}</h1>
              <CourierStatusBadge status={courier.status} />
              {isInactive && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-800/50 rounded-full">
                  Compte désactivé
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm">{courier.profile.email}</p>
            {courier.profile.phone && (
              <p className="text-zinc-600 text-sm mt-0.5">{courier.profile.phone}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/couriers/${courier.id}/edit`}
              className="px-4 py-2 text-sm font-medium text-zinc-300 border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700/60 hover:border-zinc-600 rounded-lg transition-all flex items-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </Link>
            <CourierToggleActiveButton
              courierId={courier.id}
              profileId={courier.profile_id}
              isActive={courier.profile.is_active}
              courierName={displayName}
            />
            <CourierDeleteButton
              courierId={courier.id}
              profileId={courier.profile_id}
              courierName={displayName}
            />
          </div>
        </div>
      </div>

      {/* Grille d'infos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <InfoCard title="Véhicule" accent="border-t-orange-500">
          <InfoRow label="Type"   value={getVehicleLabel(courier.vehicle_type)} />
          <InfoRow label="Plaque" value={courier.vehicle_plate ?? "—"} mono />
        </InfoCard>

        <InfoCard title="Dernière position" accent="border-t-emerald-500">
          <InfoRow label="Coordonnées" value={formatCourierLocation(courier.current_lat, courier.current_lng)} mono />
          <InfoRow label="Mis à jour"  value={formatLastLocationTime(courier.last_location_at)} />
        </InfoCard>

        <InfoCard title="Performances" accent="border-t-blue-500">
          <InfoRow label="Livraisons" value={courier.total_deliveries.toLocaleString("fr-FR")} />
          <InfoRow label="Note"       value={formatCourierRating(courier.rating)} />
        </InfoCard>
      </div>

      <CourierStatsCard
        totalDeliveries={courier.total_deliveries}
        rating={courier.rating}
        status={courier.status}
        memberSince={courier.created_at}
      />
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function InfoCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
      <div className={["h-0.5 w-full", accent].join(" ")} />
      <div className="p-5">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">{title}</h3>
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-zinc-500 flex-shrink-0">{label}</span>
      <span className={["text-sm text-zinc-200 text-right", mono ? "font-mono text-xs" : ""].join(" ")}>
        {value}
      </span>
    </div>
  );
}
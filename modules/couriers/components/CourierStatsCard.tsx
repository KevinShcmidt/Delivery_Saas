/**
 * modules/couriers/components/courier-stats-card/CourierStatsCard.tsx
 * Dark mode — style FleetOps
 */

import { formatCourierRating } from "@/core/entities/courier.entity";
import type { CourierStatus } from "@/core/types";
import { CourierStatusBadge } from "./CourierStatusBadge";

interface CourierStatsCardProps {
  totalDeliveries: number;
  rating: number | null;
  status: CourierStatus;
  memberSince: string;
}

export function CourierStatsCard({
  totalDeliveries,
  rating,
  status,
  memberSince,
}: CourierStatsCardProps) {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric", month: "long", day: "numeric",
  }).format(new Date(memberSince));

  const stats = [
    { label: "Livraisons totales", value: totalDeliveries.toLocaleString("fr-FR"), icon: "📦", accent: "text-blue-400" },
    { label: "Note moyenne",       value: formatCourierRating(rating),              icon: "⭐", accent: "text-yellow-400" },
    { label: "Membre depuis",      value: formattedDate,                            icon: "📅", accent: "text-zinc-400" },
  ];

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Statistiques
        </h3>
        <CourierStatusBadge status={status} />
      </div>

      <div className="space-y-1">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center justify-between py-3 border-b border-zinc-800/60 last:border-0"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base" aria-hidden="true">{stat.icon}</span>
              <span className="text-sm text-zinc-400">{stat.label}</span>
            </div>
            <span className={["text-sm font-semibold", stat.accent].join(" ")}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
/**
 * modules/couriers/components/courier-detail/CourierStatsCard.tsx
 */

import { Package, Star, Calendar } from "lucide-react";
import { formatCourierRating }     from "@/core/entities/courier.entity";
import type { CourierStatus }      from "@/core/types";
import { CourierStatusBadge }      from "./CourierStatusBadge";

interface CourierStatsCardProps {
  totalDeliveries: number;
  rating:          number | null;
  status:          CourierStatus;
  memberSince:     string;
}

export function CourierStatsCard({ totalDeliveries, rating, status, memberSince }: CourierStatsCardProps) {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    year: "numeric", month: "long", day: "numeric",
  }).format(new Date(memberSince));

  const stats = [
    { label: "Livraisons totales", value: totalDeliveries.toLocaleString("fr-FR"), icon: Package,  accent: "text-blue-400",   bg: "bg-blue-500/10"   },
    { label: "Note moyenne",       value: formatCourierRating(rating),              icon: Star,     accent: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Membre depuis",      value: formattedDate,                            icon: Calendar, accent: "text-zinc-300",   bg: "bg-zinc-500/10"   },
  ];

  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Statistiques</h3>
        <CourierStatusBadge status={status} />
      </div>

      <div className="space-y-1">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2.5">
                <div className={["w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", stat.bg].join(" ")}>
                  <Icon className={["w-3.5 h-3.5", stat.accent].join(" ")} />
                </div>
                <span className="text-sm text-zinc-400">{stat.label}</span>
              </div>
              <span className={["text-sm font-semibold", stat.accent].join(" ")}>{stat.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
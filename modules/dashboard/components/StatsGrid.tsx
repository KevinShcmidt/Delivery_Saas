/**
 * modules/dashboard/components/StatsGrid.tsx
 * Grille des KPI cards du dashboard.
 */

import KpiCard from "@/components/ui/KpiCard";
import type { DashboardStats } from "@/modules/dashboard/queries/dashboard.queries";

const IconPackage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V10z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
    <rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

interface StatsGridProps {
  stats:    DashboardStats;
  loading?: boolean;
}

export default function StatsGrid({ stats, loading = false }: StatsGridProps) {
  const cards = [
    {
      label:       "Commandes totales",
      value:       stats.totalOrders,
      subtitle:    `${stats.pendingOrders} en attente`,
      icon:        <IconPackage />,
      accentColor: "indigo" as const,
      change:      { value: 8.2, trend: "up" as const },
    },
    {
      label:       "En transit",
      value:       stats.inTransitOrders,
      subtitle:    `${stats.deliveredOrders} livrees`,
      icon:        <IconTruck />,
      accentColor: "amber" as const,
      change:      { value: 3.1, trend: "up" as const },
    },
    {
      label:       "Livreurs actifs",
      value:       `${stats.availableCouriers}/${stats.totalCouriers}`,
      subtitle:    "disponibles maintenant",
      icon:        <IconTruck />,
      accentColor: "emerald" as const,
      change:      { value: 5.0, trend: "up" as const },
    },
    {
      label:       "Temps moyen",
      value:       stats.avgDeliveryTime,
      suffix:      "min",
      subtitle:    "par livraison",
      icon:        <IconClock />,
      accentColor: "cyan" as const,
      change:      { value: 2.4, trend: "down" as const, upIsGood: false },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} loading={loading} />
      ))}
    </div>
  );
}
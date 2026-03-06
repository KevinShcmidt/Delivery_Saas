/**
 * app/dashboard/page.tsx
 */

import { getDashboardData } from "@/modules/dashboard/queries/dashboard.queries";
import StatsGrid            from "@/modules/dashboard/components/StatsGrid";
import RecentOrdersTable    from "@/modules/dashboard/components/RecentOrdersTable";
import DeliveryActivityChart from "@/modules/dashboard/components/DeliveryActivityChart";
import CourierStatusChart   from "@/modules/dashboard/components/CourierStatusChart";
import PageHeader           from "@/components/ui/PageHeader";

export const revalidate = 60;

export const metadata = {
  title:       "Dashboard | FleetOps",
  description: "Vue d'ensemble des opérations de livraison",
};

export default async function DashboardPage() {
  const {
    stats, recentOrders, recentOrdersCount,
    dailyData, weeklyData, monthlyData,
    courierStatusCounts,
  } = await getDashboardData();

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle={formattedDate} />

      {/* KPIs */}
      <StatsGrid stats={stats} />

      {/* Charts — Activité livraisons + Statut livreurs */}
      <div className="flex flex-col lg:flex-row gap-4 mt-6">
        <DeliveryActivityChart
          dailyData={dailyData}
          weeklyData={weeklyData}
          monthlyData={monthlyData}
        />
        <CourierStatusChart data={courierStatusCounts} />
      </div>

      {/* Commandes récentes */}
      <RecentOrdersTable
        orders={recentOrders}
        count={recentOrdersCount}
      />
    </div>
  );
}
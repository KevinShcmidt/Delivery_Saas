/**
 * modules/dashboard/queries/dashboard.queries.ts
 */

import { createAdminClient } from "@/lib/supabase.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders:       number;
  pendingOrders:     number;
  inTransitOrders:   number;
  deliveredOrders:   number;
  totalCouriers:     number;
  availableCouriers: number;
  todayRevenue:      number;
  avgDeliveryTime:   number;
}

export interface RecentOrder {
  id:                  string;
  order_number:        string;
  status:              string;
  created_at:          string;
  total_amount:        number;
  delivery_address:    string;
  client_name_manual:  string | null;
  client:              { full_name: string } | null;
  courier:             { full_name: string } | null;
}

export interface DailyDelivery {
  date:      string; // ex: "Lun", "S1", "9h"
  delivered: number;
  total:     number;
}

export interface CourierStatusCounts {
  available: number;
  busy:      number;
  offline:   number;
}

export interface DashboardData {
  stats:               DashboardStats;
  recentOrders:        RecentOrder[];
  recentOrdersCount:   number;
  dailyData:           DailyDelivery[];  // vue jour  — tranches de 3h
  weeklyData:          DailyDelivery[];  // vue semaine — 7 derniers jours
  monthlyData:         DailyDelivery[];  // vue mois — 4 semaines
  courierStatusCounts: CourierStatusCounts;
}

// ─── Query principale ─────────────────────────────────────────────────────────

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [ordersResult, couriersResult, revenueResult, recentResult, chartOrdersResult] =
    await Promise.all([

      supabase.from("orders").select("status"),

      supabase.from("couriers").select("status"),

      supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "delivered")
        .gte("created_at", todayStart.toISOString()),

      // orders.courier_id → profiles.id via fk_courier
      // orders.client_id  → profiles.id via orders_client_id_fkey
      supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          created_at,
          total_amount,
          delivery_address,
          client_name_manual,
          client:profiles!orders_client_id_fkey(full_name),
          courier:profiles!fk_courier(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(8),

      // Commandes 30 derniers jours pour les graphiques
      supabase
        .from("orders")
        .select("status, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

  if (recentResult.error) {
    console.error("[DashboardQuery] recentOrders:", recentResult.error.message);
  }

  const orders      = ordersResult.data      ?? [];
  const couriers    = couriersResult.data    ?? [];
  const orders30    = chartOrdersResult.data ?? [];

  // ── Stats KPI ──────────────────────────────────────────────────────────────
  const stats: DashboardStats = {
    totalOrders:       orders.length,
    pendingOrders:     orders.filter((o) => o.status === "pending").length,
    inTransitOrders:   orders.filter((o) => o.status === "in_transit").length,
    deliveredOrders:   orders.filter((o) => o.status === "delivered").length,
    totalCouriers:     couriers.length,
    availableCouriers: couriers.filter((c) => c.status === "available").length,
    todayRevenue:      (revenueResult.data ?? []).reduce(
      (sum, o) => sum + (o.total_amount ?? 0), 0
    ),
    avgDeliveryTime: 32,
  };

  // ── Commandes récentes ────────────────────────────────────────────────────
  const recentOrders: RecentOrder[] = (recentResult.data ?? []).map((o: any) => {
    const client  = Array.isArray(o.client)  ? o.client[0]  : o.client;
    const courier = Array.isArray(o.courier) ? o.courier[0] : o.courier;
    return {
      id:                 o.id,
      order_number:       o.order_number,
      status:             o.status,
      created_at:         o.created_at,
      total_amount:       o.total_amount ?? 0,
      delivery_address:   o.delivery_address,
      client_name_manual: o.client_name_manual ?? null,
      client:             client  ? { full_name: client.full_name }  : null,
      courier:            courier ? { full_name: courier.full_name } : null,
    };
  });

  // ── Chart data — vue semaine (7 derniers jours) ───────────────────────────
  const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const weeklyData: DailyDelivery[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const dayOrders = orders30.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= d.getTime() && t < nextD.getTime();
    });
    weeklyData.push({
      date:      DAY_LABELS[d.getDay()],
      delivered: dayOrders.filter((o) => o.status === "delivered").length,
      total:     dayOrders.length,
    });
  }

  // ── Chart data — vue mois (4 semaines) ───────────────────────────────────
  const monthlyData: DailyDelivery[] = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7 - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekOrders = orders30.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    });
    monthlyData.push({
      date:      "S" + (4 - i),
      delivered: weekOrders.filter((o) => o.status === "delivered").length,
      total:     weekOrders.length,
    });
  }

  // ── Chart data — vue jour (tranches de 3h) ────────────────────────────────
  const dailyData: DailyDelivery[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const slotEnd   = new Date(now.getTime() - i * 3 * 3600000);
    const slotStart = new Date(slotEnd.getTime() - 3 * 3600000);
    const slotOrders = orders30.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= slotStart.getTime() && t < slotEnd.getTime();
    });
    dailyData.push({
      date:      slotEnd.getHours() + "h",
      delivered: slotOrders.filter((o) => o.status === "delivered").length,
      total:     slotOrders.length,
    });
  }

  // ── Statut livreurs temps réel ────────────────────────────────────────────
  const courierStatusCounts: CourierStatusCounts = {
    available: couriers.filter((c) => c.status === "available").length,
    busy:      couriers.filter((c) => c.status === "busy").length,
    offline:   couriers.filter((c) => c.status === "offline").length,
  };

  return {
    stats,
    recentOrders,
    recentOrdersCount: recentOrders.length,
    dailyData,
    weeklyData,
    monthlyData,
    courierStatusCounts,
  };
}
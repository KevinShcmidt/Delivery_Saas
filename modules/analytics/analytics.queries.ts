/**
 * modules/analytics/queries/analytics.queries.ts
 * Toutes les requêtes pour la page statistiques.
 * Exécutées en parallèle côté serveur.
 */

import { createAdminClient } from "@/lib/supabase.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyStats {
  date:       string; // "2024-01-15"
  orders:     number;
  revenue:    number;
  delivered:  number;
  cancelled:  number;
}

export interface StatusBreakdown {
  status: string;
  count:  number;
  label:  string;
  color:  string;
}

export interface CourierPerformance {
  id:               string;
  full_name:        string;
  total_deliveries: number;
  rating:           number | null;
  vehicle_type:     string;
  status:           string;
  // Calculés
  deliveriesInPeriod: number;
  revenueInPeriod:    number;
}

export interface AnalyticsData {
  // KPIs globaux
  totalOrders:      number;
  totalRevenue:     number;
  deliveredOrders:  number;
  cancelledOrders:  number;
  avgOrderValue:    number;
  deliveryRate:     number;   // % livré / total
  avgDeliveryMin:   number;   // délai moyen en minutes

  // Évolution journalière
  dailyStats: DailyStats[];

  // Répartition par statut
  statusBreakdown: StatusBreakdown[];

  // Classement livreurs
  courierRanking: CourierPerformance[];

  // Période
  periodDays: number;
  periodStart: string;
  periodEnd:   string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:    { label: "En attente",  color: "#6366f1" },
  assigned:   { label: "Assigné",     color: "#3b82f6" },
  in_transit: { label: "En transit",  color: "#f59e0b" },
  delivered:  { label: "Livré",       color: "#10b981" },
  failed:     { label: "Échoué",      color: "#ef4444" },
  cancelled:  { label: "Annulé",      color: "#71717a" },
};

// ─── Query principale ─────────────────────────────────────────────────────────

export async function getAnalyticsData(periodDays = 7): Promise<AnalyticsData> {
  const supabase = createAdminClient();

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodDays);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date();

  const [ordersResult, allOrdersResult, couriersResult] = await Promise.all([

    // Commandes dans la période
    supabase
      .from("orders")
      .select("id, status, total_amount, created_at, delivered_at, picked_up_at, courier_id")
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: true }),

    // Toutes les commandes pour la répartition statuts globale
    supabase
      .from("orders")
      .select("status"),

    // Livreurs avec profil
    supabase
      .from("couriers")
      .select(`
        id,
        total_deliveries,
        rating,
        vehicle_type,
        status,
        profile_id,
        profile:profiles!couriers_profile_id_fkey(full_name)
      `)
      .order("total_deliveries", { ascending: false }),
  ]);

  const orders    = ordersResult.data    ?? [];
  const allOrders = allOrdersResult.data ?? [];
  const couriers  = couriersResult.data  ?? [];

  // ── KPIs globaux ──────────────────────────────────────────────────────────
  const totalOrders     = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const totalRevenue    = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
  const avgOrderValue   = deliveredOrders > 0 ? Math.round(totalRevenue / deliveredOrders) : 0;
  const deliveryRate    = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;

  // Délai moyen (picked_up_at → delivered_at) en minutes
  const deliveryTimes = orders
    .filter((o) => o.delivered_at && o.picked_up_at)
    .map((o) => (new Date(o.delivered_at!).getTime() - new Date(o.picked_up_at!).getTime()) / 60000);
  const avgDeliveryMin = deliveryTimes.length > 0
    ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
    : 0;

  // ── Évolution journalière ─────────────────────────────────────────────────
  const dailyMap = new Map<string, DailyStats>();

  // Initialise tous les jours de la période à zéro
  for (let i = 0; i <= periodDays; i++) {
    const d = new Date(periodStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    dailyMap.set(key, { date: key, orders: 0, revenue: 0, delivered: 0, cancelled: 0 });
  }

  orders.forEach((o) => {
    const key = o.created_at.split("T")[0];
    const day = dailyMap.get(key);
    if (!day) return;
    day.orders++;
    if (o.status === "delivered") {
      day.delivered++;
      day.revenue += Number(o.total_amount ?? 0);
    }
    if (o.status === "cancelled") day.cancelled++;
  });

  const dailyStats = Array.from(dailyMap.values());

  // ── Répartition par statut (global) ──────────────────────────────────────
  const statusCounts = new Map<string, number>();
  allOrders.forEach((o) => {
    statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
  });

  const statusBreakdown: StatusBreakdown[] = Object.entries(STATUS_META).map(([status, meta]) => ({
    status,
    count: statusCounts.get(status) ?? 0,
    label: meta.label,
    color: meta.color,
  })).filter((s) => s.count > 0);

  // ── Classement livreurs ───────────────────────────────────────────────────
  // Commandes livrées dans la période par livreur
  const deliveredInPeriod = orders.filter((o) => o.status === "delivered" && o.courier_id);
  const courierDeliveries = new Map<string, { count: number; revenue: number }>();
  deliveredInPeriod.forEach((o) => {
    const existing = courierDeliveries.get(o.courier_id!) ?? { count: 0, revenue: 0 };
    courierDeliveries.set(o.courier_id!, {
      count:   existing.count + 1,
      revenue: existing.revenue + Number(o.total_amount ?? 0),
    });
  });

  const courierRanking: CourierPerformance[] = couriers.map((c: any) => {
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    const periodData = courierDeliveries.get(c.profile_id) ?? { count: 0, revenue: 0 };
    return {
      id:                 c.id,
      full_name:          profile?.full_name ?? "Inconnu",
      total_deliveries:   c.total_deliveries ?? 0,
      rating:             c.rating ? Number(c.rating) : null,
      vehicle_type:       c.vehicle_type,
      status:             c.status,
      deliveriesInPeriod: periodData.count,
      revenueInPeriod:    periodData.revenue,
    };
  }).sort((a, b) => b.deliveriesInPeriod - a.deliveriesInPeriod);

  return {
    totalOrders, totalRevenue, deliveredOrders, cancelledOrders,
    avgOrderValue, deliveryRate, avgDeliveryMin,
    dailyStats, statusBreakdown, courierRanking,
    periodDays,
    periodStart: periodStart.toISOString().split("T")[0],
    periodEnd:   periodEnd.toISOString().split("T")[0],
  };
}
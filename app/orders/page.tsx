/**
 * app/orders/page.tsx
 * Le titre "Commandes" est géré par OrdersClient via PageHeader — pas ici.
 */

import { Suspense }          from "react";
import OrdersLoading         from "./loading";
import { getOrdersKanban, getAvailableCouriers } from "@/modules/orders/queries/orders.queries";
import { createAdminClient } from "@/lib/supabase.server";

export const metadata = { title: "Commandes | FleetOps" };
export const revalidate = 0;

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoading />}>
      <OrdersDataLayer />
    </Suspense>
  );
}

async function OrdersDataLayer() {
  try {
    const supabase = createAdminClient();

    const [rawKanban, availableCouriers, clientsResult] = await Promise.all([
      getOrdersKanban(),
      getAvailableCouriers(),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "client")
        .eq("is_active", true),
    ]);

    const safeKanban = rawKanban || {
      pending: [], assigned: [], in_transit: [],
      delivered: [], failed: [], cancelled: [],
    };

    const totalCount =
      (safeKanban.pending?.length    || 0) +
      (safeKanban.assigned?.length   || 0) +
      (safeKanban.in_transit?.length || 0) +
      (safeKanban.delivered?.length  || 0) +
      (safeKanban.failed?.length     || 0) +
      (safeKanban.cancelled?.length  || 0);

    const OrdersClient = (
      await import("@/modules/orders/components/OrdersClient")
    ).default;

    return (
      <OrdersClient
        initialData={safeKanban}
        availableCouriers={availableCouriers || []}
        clients={clientsResult.data || []}
        totalCount={totalCount}
      />
    );
  } catch (error: any) {
    console.error("❌ Crash dans OrdersDataLayer:", error.message);
    return (
      <div className="p-4 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
        Erreur critique : {error.message}
      </div>
    );
  }
}
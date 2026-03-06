/**
 * modules/map/queries/map.queries.ts
 * Données temps réel pour la carte — livreurs + commandes actives
 */

import { createAdminClient } from "@/lib/supabase.server";

export interface MapCourier {
  id:          string;
  profile_id:  string;
  full_name:   string;
  status:      string;
  vehicle_type: string;
  current_lat:  number | null;
  current_lng:  number | null;
  last_location_at: string | null;
  // Commande active si elle existe
  active_order?: {
    id:               string;
    order_number:     string;
    delivery_address: string;
    delivery_lat:     number | null;
    delivery_lng:     number | null;
    pickup_address:   string;
    pickup_lat:       number | null;
    pickup_lng:       number | null;
    status:           string;
  } | null;
}

export interface MapData {
  couriers:     MapCourier[];
  activeCounts: {
    available: number;
    busy:      number;
    offline:   number;
  };
}

export async function getMapData(): Promise<MapData> {
  const supabase = createAdminClient();

  // Fetch livreurs avec leur profil
  const { data: couriers, error } = await supabase
    .from("couriers")
    .select(`
      id,
      profile_id,
      status,
      vehicle_type,
      current_lat,
      current_lng,
      last_location_at,
      profile:profiles!couriers_profile_id_fkey(full_name)
    `)
    .order("status", { ascending: true });

  if (error) {
    console.error("[MapQuery] getMapData:", error.message);
    return { couriers: [], activeCounts: { available: 0, busy: 0, offline: 0 } };
  }

  // Fetch commandes actives (assigned + in_transit)
  const { data: activeOrders } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      courier_id,
      status,
      delivery_address,
      delivery_lat,
      delivery_lng,
      pickup_address,
      pickup_lat,
      pickup_lng
    `)
    .in("status", ["assigned", "in_transit"]);

  // Map courier_id (profile_id) → commande active
  const orderByCourierId = new Map(
    (activeOrders ?? []).map((o) => [o.courier_id, o])
  );

  const mappedCouriers: MapCourier[] = (couriers ?? []).map((c: any) => {
    const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
    const activeOrder = orderByCourierId.get(c.profile_id) ?? null;

    return {
      id:               c.id,
      profile_id:       c.profile_id,
      full_name:        profile?.full_name ?? "Livreur inconnu",
      status:           c.status,
      vehicle_type:     c.vehicle_type,
      current_lat:      c.current_lat ? Number(c.current_lat) : null,
      current_lng:      c.current_lng ? Number(c.current_lng) : null,
      last_location_at: c.last_location_at,
      active_order:     activeOrder ? {
        id:               activeOrder.id,
        order_number:     activeOrder.order_number,
        delivery_address: activeOrder.delivery_address,
        delivery_lat:     activeOrder.delivery_lat ? Number(activeOrder.delivery_lat) : null,
        delivery_lng:     activeOrder.delivery_lng ? Number(activeOrder.delivery_lng) : null,
        pickup_address:   activeOrder.pickup_address,
        pickup_lat:       activeOrder.pickup_lat ? Number(activeOrder.pickup_lat) : null,
        pickup_lng:       activeOrder.pickup_lng ? Number(activeOrder.pickup_lng) : null,
        status:           activeOrder.status,
      } : null,
    };
  });

  const activeCounts = {
    available: mappedCouriers.filter((c) => c.status === "available").length,
    busy:      mappedCouriers.filter((c) => c.status === "busy").length,
    offline:   mappedCouriers.filter((c) => c.status === "offline").length,
  };

  return { couriers: mappedCouriers, activeCounts };
}




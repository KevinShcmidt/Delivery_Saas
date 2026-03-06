/**
 * modules/orders/queries/orders.queries.ts
 */
import { createAdminClient } from "@/lib/supabase.server";
export type { OrderStatus } from "@/core/types"; 
import { OrderStatus } from "@/core/types";

// --- Interfaces Exportées ---

export interface OrderClient {
  id:        string;
  full_name: string;
  phone:     string | null;
}

export interface OrderCourier {
  id:        string;
  full_name: string;
  phone:     string | null;
}

export interface Order {
  id:                  string;
  order_number:        string;
  client_id?:          string | null;
  client_name_manual?: string | null;
  client_phone_manual?: string | null;
  status:              OrderStatus;
  total_amount:        number;
  currency:            string;
  pickup_address:      string;
  delivery_address:    string;
  created_at:          string;
  client:              OrderClient | null;
  courier:             OrderCourier | null;
  assigned_at:         string | null;
  picked_up_at:        string | null;
  delivered_at:        string | null;
  cancelled_at:        string | null;
  notes:               string | null;
}

export interface KanbanData {
  pending:    Order[];
  assigned:   Order[];
  in_transit: Order[];
  delivered:  Order[];
  failed:     Order[];
  cancelled:  Order[];
}

// --- Queries ---

export async function getOrdersKanban(): Promise<KanbanData> {
  const supabase = createAdminClient();

  // On utilise les noms de FK explicites pour lever l'ambiguïté Supabase.
  // orders.client_id  → profiles via orders_client_id_fkey
  // orders.courier_id → profiles via fk_courier
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      client:profiles!orders_client_id_fkey(id, full_name, phone),
      courier:profiles!fk_courier(id, full_name, phone)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[OrdersQuery] getOrdersKanban:", error.message);
    return emptyKanban();
  }

  const orders = (data ?? []).map(normalizeOrder);
  return groupByStatus(orders);
}

/**
 * Récupère les profils clients actifs
 */
export async function getAvailableClients(): Promise<OrderClient[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "client")
    .eq("is_active", true);
    
  return data ?? [];
}

/**
 * Récupère les profils livreurs actifs
 * Retourne profiles.id — car orders.courier_id référence profiles.id (FK: fk_courier)
 */
export async function getAvailableCouriers(): Promise<OrderCourier[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "courier")
    .eq("is_active", true);
    
  return data ?? [];
}

// --- Helpers Internes ---

function normalizeOrder(raw: any): Order {
  return {
    ...raw,
    total_amount: Number(raw.total_amount ?? 0),
    client:  raw.client  ? (Array.isArray(raw.client)  ? raw.client[0]  : raw.client)  : null,
    courier: raw.courier ? (Array.isArray(raw.courier) ? raw.courier[0] : raw.courier) : null,
  };
}

function emptyKanban(): KanbanData {
  return {
    pending: [], assigned: [], in_transit: [],
    delivered: [], failed: [], cancelled: [],
  };
}

function groupByStatus(ordersList: Order[]): KanbanData {
  const kanban = emptyKanban();

  ordersList.forEach((o) => {
    if (kanban[o.status as keyof KanbanData]) {
      kanban[o.status as keyof KanbanData].push(o);
    } else {
      kanban.pending.push(o);
    }
  });

  return kanban;
}
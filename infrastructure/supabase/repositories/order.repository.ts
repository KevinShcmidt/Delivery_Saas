/**
 * infrastructure/supabase/repositories/order.repository.ts
 * ─────────────────────────────────────────────
 * Toutes les requêtes Supabase liées aux commandes.
 *
 * Règles :
 * - Chaque fonction retourne toujours { data, error } — jamais de throw
 * - Fonctions SERVER → createAdminClient (bypass RLS)
 * - Fonctions CLIENT → createClient (respecte RLS)
 */

import { createAdminClient } from "@/lib/supabase.server";
import { createClient } from "@/lib/client";
import type {
  Order,
  OrderInsert,
  OrderUpdate,
  OrderWithDetails,
  OrderWithParties,
  OrderStatus,
  RepositoryResponse,
  RepositoryListResponse,
} from "@/core/types";

// ============================================================
// TYPES LOCAUX — Paramètres de filtrage
// ============================================================

interface GetOrdersFilters {
  status?: OrderStatus;
  clientId?: string;
  courierId?: string;
  /** Pagination — page commence à 1 */
  page?: number;
  /** Nombre d'éléments par page (défaut: 20) */
  perPage?: number;
}

// ============================================================
// REQUÊTES SERVEUR — Admin / Server Actions
// ============================================================

/**
 * Récupère une commande par son ID avec toutes ses relations
 * (client, livreur, articles, tracking)
 * @example const { data: order } = await getOrderById(orderId)
 */
export async function getOrderById(
  id: string
): Promise<RepositoryResponse<OrderWithDetails>> {
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      client:profiles!orders_client_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      ),
      courier:couriers!orders_courier_id_fkey (
        *,
        profile:profiles!couriers_profile_id_fkey (
          id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
        )
      ),
      items:order_items (*),
      tracking:order_tracking (*)
    `)
    .eq("id", id)
    .order("created_at", { referencedTable: "order_tracking", ascending: true })
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[OrderRepository] getOrderById:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as unknown as OrderWithDetails, error: null };
}

/**
 * Récupère une commande par son numéro lisible (ex: CMD-00042)
 * @example const { data: order } = await getOrderByNumber('CMD-00042')
 */
export async function getOrderByNumber(
  orderNumber: string
): Promise<RepositoryResponse<OrderWithParties>> {
  if (!orderNumber) {
    return { data: null, error: "Numéro de commande manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      client:profiles!orders_client_id_fkey (
        id, full_name, phone, avatar_url
      ),
      courier:couriers!orders_courier_id_fkey (
        id, status, vehicle_type,
        profile:profiles!couriers_profile_id_fkey (
          id, full_name, phone, avatar_url
        )
      )
    `)
    .eq("order_number", orderNumber.toUpperCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[OrderRepository] getOrderByNumber:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as unknown as OrderWithParties, error: null };
}

/**
 * Récupère toutes les commandes avec filtres et pagination
 * @example const { data: orders, count } = await getAllOrders({ status: 'pending', page: 1 })
 */
export async function getAllOrders(
  filters: GetOrdersFilters = {}
): Promise<RepositoryListResponse<OrderWithParties>> {
  const { status, clientId, courierId, page = 1, perPage = 20 } = filters;

  // Calcul de l'offset pour la pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      client:profiles!orders_client_id_fkey (
        id, full_name, phone, avatar_url
      ),
      courier:couriers!orders_courier_id_fkey (
        id, status, vehicle_type,
        profile:profiles!couriers_profile_id_fkey (
          id, full_name, phone, avatar_url
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Filtres optionnels — on n'applique que ceux qui sont fournis
  if (status) query = query.eq("status", status);
  if (clientId) query = query.eq("client_id", clientId);
  if (courierId) query = query.eq("courier_id", courierId);

  const { data, error, count } = await query;

  if (error) {
    console.error("[OrderRepository] getAllOrders:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return {
    data: (data as unknown as OrderWithParties[]) ?? [],
    error: null,
    count: count ?? 0,
  };
}

/**
 * Crée une nouvelle commande
 * Le numéro de commande est généré automatiquement par la DB (trigger)
 * @example const { data: order } = await createOrder({ client_id, delivery_address, ... })
 */
export async function createOrder(
  // On omet order_number car généré automatiquement par le trigger SQL
  payload: Omit<OrderInsert, "order_number">
): Promise<RepositoryResponse<Order>> {
  // Validations défensives
  if (!payload.client_id) {
    return { data: null, error: "client_id manquant" };
  }
  if (!payload.pickup_address) {
    return { data: null, error: "Adresse de récupération manquante" };
  }
  if (!payload.delivery_address) {
    return { data: null, error: "Adresse de livraison manquante" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      ...payload,
      // order_number sera généré par le trigger SQL (generate_order_number)
      order_number: "", // valeur temporaire, le trigger la remplace
      status: "pending", // toujours pending à la création
    })
    .select()
    .single();

  if (error) {
    console.error("[OrderRepository] createOrder:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Assigne un livreur à une commande
 * Change le statut de pending → assigned
 * @example await assignCourier(orderId, courierId)
 */
export async function assignCourier(
  orderId: string,
  courierId: string
): Promise<RepositoryResponse<Order>> {
  if (!orderId || !courierId) {
    return { data: null, error: "orderId et courierId sont requis" };
  }

  const supabase = createAdminClient();

  // Vérification : la commande doit être en "pending" pour être assignée
  const { data: existingOrder, error: fetchError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !existingOrder) {
    return { data: null, error: "Commande introuvable" };
  }

  if (existingOrder.status !== "pending") {
    return {
      data: null,
      error: `Impossible d'assigner : la commande est déjà "${existingOrder.status}"`,
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      courier_id: courierId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("[OrderRepository] assignCourier:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Met à jour le statut d'une commande
 * Le trigger SQL enregistre automatiquement le changement dans order_tracking
 * @example await updateOrderStatus(orderId, 'in_transit')
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  extra?: {
    deliveryPhotoUrl?: string;
    cancelReason?: string;
  }
): Promise<RepositoryResponse<Order>> {
  if (!orderId) {
    return { data: null, error: "orderId manquant" };
  }

  const supabase = createAdminClient();

  // Champs additionnels selon le statut
  const additionalFields: Partial<OrderUpdate> = {};

  if (newStatus === "delivered") {
    additionalFields.delivered_at = new Date().toISOString();
    if (extra?.deliveryPhotoUrl) {
      additionalFields.delivery_photos = [extra.deliveryPhotoUrl];
    }
  }

  if (newStatus === "in_transit") {
    additionalFields.picked_up_at = new Date().toISOString();
  }

  if (newStatus === "cancelled") {
    additionalFields.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: newStatus, ...additionalFields })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    console.error("[OrderRepository] updateOrderStatus:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Récupère les statistiques globales des commandes
 * Utilisé dans le dashboard admin
 */
export async function getOrdersStats(): Promise<
  RepositoryResponse<{
    total: number;
    pending: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
    failed: number;
  }>
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("orders")
    .select("status", { count: "exact" });

  if (error) {
    console.error("[OrderRepository] getOrdersStats:", error.message);
    return { data: null, error: error.message };
  }

  // On compte les occurrences de chaque statut
  const stats = (data ?? []).reduce(
    (acc, order) => {
      acc.total++;
      // On vérifie que le statut est une clé valide avant d'incrémenter
      if (order.status in acc) {
        acc[order.status as keyof typeof acc]++;
      }
      return acc;
    },
    { total: 0, pending: 0, in_transit: 0, delivered: 0, cancelled: 0, failed: 0 }
  );

  return { data: stats, error: null };
}

// ============================================================
// REQUÊTES CLIENT — Utilisateur connecté (RLS actif)
// ============================================================

/**
 * Récupère les commandes de l'utilisateur connecté
 * Un client voit ses commandes, un livreur voit ses livraisons
 * @example const { data: myOrders } = await getMyOrders()
 */
export async function getMyOrders(
  filters: Pick<GetOrdersFilters, "status" | "page" | "perPage"> = {}
): Promise<RepositoryListResponse<OrderWithParties>> {
  const { status, page = 1, perPage = 20 } = filters;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createClient();

  let query = supabase
    .from("orders")
    .select(
      `
      *,
      client:profiles!orders_client_id_fkey (
        id, full_name, phone, avatar_url
      ),
      courier:couriers!orders_courier_id_fkey (
        id, status, vehicle_type,
        profile:profiles!couriers_profile_id_fkey (
          id, full_name, phone, avatar_url
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;

  if (error) {
    console.error("[OrderRepository] getMyOrders:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return {
    data: (data as unknown as OrderWithParties[]) ?? [],
    error: null,
    count: count ?? 0,
  };
}
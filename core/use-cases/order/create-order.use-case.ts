/**
 * core/use-cases/order/create-order.use-case.ts
 * ─────────────────────────────────────────────
 * Logique métier pour créer une commande.
 *
 * Ce use case orchestre plusieurs repositories :
 * 1. Vérifie que le client existe et est actif
 * 2. Crée la commande
 * 3. Crée les articles de la commande
 * 4. Retourne la commande créée
 *
 * Les notifications sont gérées automatiquement par les triggers SQL.
 */

import { createAdminClient } from "@/lib/supabase.server";
import { getProfileById } from "@/infrastructure/supabase/repositories/profile.repository";
import { createOrder } from "@/infrastructure/supabase/repositories/order.repository";
import type {
  Order,
  OrderInsert,
  OrderItemInsert,
  RepositoryResponse,
} from "@/core/types";

// ============================================================
// TYPES
// ============================================================

interface CreateOrderInput {
  clientId: string;
  pickupAddress: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  notes?: string;
  currency?: string;
  items: {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    weightKg?: number;
  }[];
}

interface CreateOrderOutput {
  order: Order;
  totalAmount: number;
}

// ============================================================
// USE CASE
// ============================================================

/**
 * Crée une commande avec ses articles
 * @example
 * const { data, error } = await createOrderUseCase({
 *   clientId: 'uuid',
 *   pickupAddress: '1 rue de la Paix, Paris',
 *   deliveryAddress: '10 rue du Commerce, Paris',
 *   items: [{ name: 'Colis', quantity: 1, unitPrice: 0 }]
 * })
 */
export async function createOrderUseCase(
  input: CreateOrderInput
): Promise<RepositoryResponse<CreateOrderOutput>> {

  // ── Étape 1 : Validation des entrées ──────────────────────
  if (!input.clientId) {
    return { data: null, error: "clientId manquant" };
  }
  if (!input.pickupAddress?.trim()) {
    return { data: null, error: "Adresse de récupération manquante" };
  }
  if (!input.deliveryAddress?.trim()) {
    return { data: null, error: "Adresse de livraison manquante" };
  }
  if (!input.items || input.items.length === 0) {
    return { data: null, error: "La commande doit contenir au moins un article" };
  }

  // Validation de chaque article
  for (const item of input.items) {
    if (!item.name?.trim()) {
      return { data: null, error: "Chaque article doit avoir un nom" };
    }
    if (item.quantity < 1) {
      return { data: null, error: `Quantité invalide pour l'article "${item.name}"` };
    }
    if (item.unitPrice < 0) {
      return { data: null, error: `Prix invalide pour l'article "${item.name}"` };
    }
  }

  // ── Étape 2 : Vérifier que le client existe et est actif ──
  const { data: client, error: clientError } = await getProfileById(input.clientId);

  if (clientError) {
    return { data: null, error: clientError };
  }
  if (!client) {
    return { data: null, error: "Client introuvable" };
  }
  if (!client.is_active) {
    return { data: null, error: "Ce compte est désactivé" };
  }
  if (client.role !== "client") {
    return { data: null, error: "Seul un client peut passer une commande" };
  }

  // ── Étape 3 : Calculer le montant total ───────────────────
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  // ── Étape 4 : Créer la commande ───────────────────────────
  const orderPayload: Omit<OrderInsert, "order_number"> = {
    client_id: input.clientId,
    pickup_address: input.pickupAddress.trim(),
    pickup_lat: input.pickupLatitude ?? null,
    pickup_lng: input.pickupLongitude ?? null,
    delivery_address: input.deliveryAddress.trim(),
    delivery_lat: input.deliveryLatitude ?? null,
    delivery_lng: input.deliveryLongitude ?? null,
    notes: input.notes?.trim() ?? null,
    currency: input.currency ?? "EUR",
    total_amount: totalAmount,
    status: "pending",
  };

  const { data: order, error: orderError } = await createOrder(orderPayload);

  if (orderError || !order) {
    return { data: null, error: orderError ?? "Erreur lors de la création de la commande" };
  }

  // ── Étape 5 : Créer les articles de la commande ───────────
  const supabase = createAdminClient();

  const itemsPayload: OrderItemInsert[] = input.items.map((item) => ({
    order_id: order.id,
    name: item.name.trim(),
    description: item.description?.trim() ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    weight_kg: item.weightKg ?? null,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsPayload);

  if (itemsError) {
    // La commande est créée mais pas les articles
    // On log l'erreur mais on retourne quand même la commande
    console.error("[CreateOrderUseCase] Erreur création articles:", itemsError.message);
    return {
      data: null,
      error: "Commande créée mais erreur sur les articles. Contactez le support.",
    };
  }

  // ── Succès ────────────────────────────────────────────────
  // Les triggers SQL s'occupent automatiquement de :
  // - Notifier les livreurs disponibles
  // - Enregistrer dans order_tracking

  return {
    data: { order, totalAmount },
    error: null,
  };
}
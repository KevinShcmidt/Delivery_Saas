/**
 * core/use-cases/order/update-order-status.use-case.ts
 * ─────────────────────────────────────────────
 * Logique métier pour mettre à jour le statut d'une commande.
 *
 * Ce use case :
 * 1. Vérifie que la transition de statut est valide
 * 2. Met à jour le statut
 * 3. Si livraison terminée → incrémente les stats du livreur
 *
 * Transitions valides :
 *   pending    → assigned   (via assignCourierUseCase)
 *   assigned   → in_transit
 *   in_transit → delivered
 *   in_transit → failed
 *   pending    → cancelled
 *   assigned   → cancelled
 */

import { updateOrderStatus } from "@/infrastructure/supabase/repositories/order.repository";
import { incrementDeliveryCount } from "@/infrastructure/supabase/repositories/courier.repository";
import { createAdminClient } from "@/lib/supabase.server";
import type { Order, OrderStatus, RepositoryResponse } from "@/core/types";

// ============================================================
// CONSTANTES — Transitions de statut autorisées
// Chaque statut a une liste de statuts vers lesquels il peut aller
// ============================================================

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ["assigned", "cancelled"],
  assigned:   ["in_transit", "cancelled"],
  in_transit: ["delivered", "failed"],
  delivered:  [], // statut final — aucune transition possible
  failed:     [], // statut final — aucune transition possible
  cancelled:  [], // statut final — aucune transition possible
};

// ============================================================
// TYPES
// ============================================================

interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus;
  /** ID du courier qui fait l'action (pour vérifier qu'il est bien assigné) */
  requestedBy?: string;
  /** Photo de preuve pour une livraison réussie */
  deliveryPhotoUrl?: string;
  /** Note du client pour le livreur (entre 1 et 5) */
  courierRating?: number;
}

// ============================================================
// USE CASE
// ============================================================

/**
 * Met à jour le statut d'une commande avec validation des transitions
 * @example
 * const { data, error } = await updateOrderStatusUseCase({
 *   orderId: 'uuid',
 *   newStatus: 'in_transit',
 *   requestedBy: 'courier-profile-id'
 * })
 */
export async function updateOrderStatusUseCase(
  input: UpdateOrderStatusInput
): Promise<RepositoryResponse<Order>> {

  // ── Étape 1 : Validation des entrées ──────────────────────
  if (!input.orderId) {
    return { data: null, error: "orderId manquant" };
  }
  if (!input.newStatus) {
    return { data: null, error: "newStatus manquant" };
  }

  // Validation de la note si fournie
  if (
    input.courierRating !== undefined &&
    (input.courierRating < 1 || input.courierRating > 5)
  ) {
    return { data: null, error: "La note doit être entre 1 et 5" };
  }

  const supabase = createAdminClient();

  // ── Étape 2 : Récupérer la commande actuelle ──────────────
  const { data: currentOrder, error: fetchError } = await supabase
    .from("orders")
    .select("id, status, courier_id, client_id")
    .eq("id", input.orderId)
    .single();

  if (fetchError || !currentOrder) {
    return { data: null, error: "Commande introuvable" };
  }

  // ── Étape 3 : Vérifier la transition de statut ────────────
  const allowedNextStatuses = VALID_TRANSITIONS[currentOrder.status];

  if (!allowedNextStatuses.includes(input.newStatus)) {
    return {
      data: null,
      error: `Transition invalide : "${currentOrder.status}" → "${input.newStatus}". Transitions autorisées : ${allowedNextStatuses.join(", ") || "aucune (statut final)"}`,
    };
  }

  // ── Étape 4 : Vérifier les permissions si requestedBy fourni ──
  if (input.requestedBy) {
    // Un livreur ne peut changer le statut que de SA commande
    const { data: courier } = await supabase
      .from("couriers")
      .select("id")
      .eq("profile_id", input.requestedBy)
      .single();

    if (courier && currentOrder.courier_id !== courier.id) {
      return {
        data: null,
        error: "Vous ne pouvez pas modifier le statut d'une commande qui ne vous est pas assignée",
      };
    }
  }

  // ── Étape 5 : Mettre à jour le statut ─────────────────────
  const { data: updatedOrder, error: updateError } = await updateOrderStatus(
    input.orderId,
    input.newStatus,
    { deliveryPhotoUrl: input.deliveryPhotoUrl }
  );

  if (updateError || !updatedOrder) {
    return { data: null, error: updateError ?? "Erreur lors de la mise à jour" };
  }

  // ── Étape 6 : Actions post-livraison ──────────────────────
  if (input.newStatus === "delivered" && currentOrder.courier_id) {
    // Incrémenter les stats du livreur + calculer sa nouvelle note
    const { error: statsError } = await incrementDeliveryCount(
      currentOrder.courier_id,
      input.courierRating
    );

    if (statsError) {
      // Non bloquant — la livraison est confirmée même si les stats échouent
      console.error("[UpdateOrderStatusUseCase] Erreur stats livreur:", statsError);
    }
  }

  // Si la livraison échoue ou est annulée → remettre le livreur disponible
  if (
    (input.newStatus === "failed" || input.newStatus === "cancelled") &&
    currentOrder.courier_id
  ) {
    const { error: statusError } = await supabase
      .from("couriers")
      .update({ status: "available" })
      .eq("id", currentOrder.courier_id);

    if (statusError) {
      console.error("[UpdateOrderStatusUseCase] Erreur remise livreur disponible:", statusError.message);
    }
  }

  // ── Succès ────────────────────────────────────────────────
  // Les triggers SQL s'occupent automatiquement de :
  // - Enregistrer le changement dans order_tracking
  // - Notifier le client du changement de statut

  return { data: updatedOrder, error: null };
}
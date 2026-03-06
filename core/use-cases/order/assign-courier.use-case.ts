/**
 * core/use-cases/order/assign-courier.use-case.ts
 * ─────────────────────────────────────────────
 * Logique métier pour assigner un livreur à une commande.
 *
 * Ce use case orchestre :
 * 1. Vérifie que la commande est en attente (pending)
 * 2. Vérifie que le livreur est disponible et actif
 * 3. Assigne le livreur à la commande
 * 4. Met le statut du livreur à 'busy'
 *
 * Les notifications sont gérées automatiquement par les triggers SQL.
 */

import { getCourierById } from "@/infrastructure/supabase/repositories/courier.repository";
import { assignCourier } from "@/infrastructure/supabase/repositories/order.repository";
import { createAdminClient } from "@/lib/supabase.server";
import type { Order, RepositoryResponse } from "@/core/types";

// ============================================================
// USE CASE
// ============================================================

/**
 * Assigne un livreur à une commande
 * @example
 * const { data, error } = await assignCourierUseCase(orderId, courierId)
 */
export async function assignCourierUseCase(
  orderId: string,
  courierId: string
): Promise<RepositoryResponse<Order>> {

  // ── Étape 1 : Validation des entrées ──────────────────────
  if (!orderId) return { data: null, error: "orderId manquant" };
  if (!courierId) return { data: null, error: "courierId manquant" };

  // ── Étape 2 : Vérifier que le livreur existe et est disponible ──
  const { data: courier, error: courierError } = await getCourierById(courierId);

  if (courierError) {
    return { data: null, error: courierError };
  }
  if (!courier) {
    return { data: null, error: "Livreur introuvable" };
  }
  if (courier.status !== "available") {
    return {
      data: null,
      error: `Ce livreur n'est pas disponible (statut actuel : ${courier.status})`,
    };
  }
  if (!courier.profile.is_active) {
    return { data: null, error: "Ce livreur est désactivé" };
  }

  // ── Étape 3 : Assigner le livreur à la commande ───────────
  // La vérification du statut "pending" est faite dans le repository
  const { data: order, error: assignError } = await assignCourier(orderId, courierId);

  if (assignError || !order) {
    return { data: null, error: assignError ?? "Erreur lors de l'assignation" };
  }

  // ── Étape 4 : Mettre le livreur en statut 'busy' ──────────
  const supabase = createAdminClient();

  const { error: statusError } = await supabase
    .from("couriers")
    .update({ status: "busy" })
    .eq("id", courierId);

  if (statusError) {
    // L'assignation a réussi mais le statut n'a pas été mis à jour
    // Ce n'est pas bloquant — on log et on continue
    console.error("[AssignCourierUseCase] Erreur mise à jour statut livreur:", statusError.message);
  }

  // ── Succès ────────────────────────────────────────────────
  // Les triggers SQL s'occupent automatiquement de :
  // - Enregistrer le changement dans order_tracking
  // - Notifier le client que sa commande est assignée
  // - Notifier le livreur qu'il a une nouvelle livraison

  return { data: order, error: null };
}
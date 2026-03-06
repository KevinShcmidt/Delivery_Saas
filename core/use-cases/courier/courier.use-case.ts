/**
 * core/use-cases/courier/courier.use-case.ts
 * ─────────────────────────────────────────────
 * Logique métier pour la gestion des livreurs.
 *
 * Ce use case orchestre :
 * - Créer un livreur depuis un profil existant
 * - Mettre à jour la position GPS + enregistrer dans order_tracking
 */

import { createClient } from "@/lib/client";
import {
  createCourier,
  updateMyCourierLocation,
} from "@/infrastructure/supabase/repositories/courier.repository";
import { changeUserRole } from "@/infrastructure/supabase/repositories/profile.repository";
import type {
  Courier,
  CourierWithProfile,
  VehicleType,
  RepositoryResponse,
} from "@/core/types";

// ============================================================
// TYPES
// ============================================================

interface CreateCourierInput {
  profileId: string;
  vehicleType: VehicleType;
  vehiclePlate?: string;
}

interface UpdateLocationInput {
  latitude: number;
  longitude: number;
  /** ID de la commande en cours (pour enregistrer dans order_tracking) */
  activeOrderId?: string;
}

// ============================================================
// USE CASES
// ============================================================

/**
 * Crée un livreur depuis un profil existant — ADMIN SEULEMENT
 * Change automatiquement le rôle du profil en 'courier'
 * @example
 * const { data } = await createCourierUseCase({
 *   profileId: 'uuid',
 *   vehicleType: 'motorcycle',
 *   vehiclePlate: 'AB-123-CD'
 * })
 */
export async function createCourierUseCase(
  input: CreateCourierInput
): Promise<RepositoryResponse<CourierWithProfile>> {

  // ── Validation ────────────────────────────────────────────
  if (!input.profileId) {
    return { data: null, error: "profileId manquant" };
  }
  if (!input.vehicleType) {
    return { data: null, error: "vehicleType manquant" };
  }

  // ── Étape 1 : Changer le rôle du profil en 'courier' ──────
  const { error: roleError } = await changeUserRole(input.profileId, "courier");

  if (roleError) {
    return { data: null, error: roleError };
  }

  // ── Étape 2 : Créer l'entrée courier ─────────────────────
  // Le repository vérifie que le profil existe et a le bon rôle
  const { data: courier, error: courierError } = await createCourier({
    profile_id: input.profileId,
    vehicle_type: input.vehicleType,
    vehicle_plate: input.vehiclePlate ?? null,
    status: "offline",
  });

  if (courierError || !courier) {
    // Si la création échoue, on remet le rôle à 'client' pour éviter
    // un profil avec role='courier' sans entrée dans couriers
    await changeUserRole(input.profileId, "client");
    return { data: null, error: courierError ?? "Erreur lors de la création du livreur" };
  }

  // ── Récupérer le livreur avec son profil ──────────────────
  const supabase = createClient();

  const { data: courierWithProfile, error: fetchError } = await supabase
    .from("couriers")
    .select(`
      *,
      profile:profiles!couriers_profile_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      )
    `)
    .eq("id", courier.id)
    .single();

  if (fetchError || !courierWithProfile) {
    return { data: null, error: "Livreur créé mais erreur lors de la récupération" };
  }

  return { data: courierWithProfile as unknown as CourierWithProfile, error: null };
}

/**
 * Met à jour la position GPS du livreur connecté
 * ET enregistre la position dans order_tracking si une livraison est en cours
 * @example
 * await updateCourierLocationUseCase({
 *   latitude: 48.8566,
 *   longitude: 2.3522,
 *   activeOrderId: 'uuid'
 * })
 */
export async function updateCourierLocationUseCase(
  input: UpdateLocationInput
): Promise<RepositoryResponse<Courier>> {

  // ── Validation GPS ────────────────────────────────────────
  if (input.latitude < -90 || input.latitude > 90) {
    return { data: null, error: "Latitude invalide" };
  }
  if (input.longitude < -180 || input.longitude > 180) {
    return { data: null, error: "Longitude invalide" };
  }

  // ── Étape 1 : Mettre à jour la position du livreur ────────
  const { data: courier, error: locationError } = await updateMyCourierLocation(
    input.latitude,
    input.longitude
  );

  if (locationError || !courier) {
    return { data: null, error: locationError ?? "Erreur mise à jour position" };
  }

  // ── Étape 2 : Enregistrer dans order_tracking si commande active ──
  if (input.activeOrderId) {
    const supabase = createClient();

    const { error: trackingError } = await supabase
      .from("order_tracking")
      .insert({
        order_id: input.activeOrderId,
        courier_id: courier.id,
        event_type: "location_update",
        latitude: input.latitude,
        longitude: input.longitude,
      });

    if (trackingError) {
      // Non bloquant — la position du livreur est mise à jour
      // même si l'enregistrement dans tracking échoue
      console.error(
        "[CourierUseCase] Erreur enregistrement tracking:",
        trackingError.message
      );
    }
  }

  return { data: courier, error: null };
}
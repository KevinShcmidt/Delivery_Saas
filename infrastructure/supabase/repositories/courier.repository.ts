/**
 * infrastructure/supabase/repositories/courier.repository.ts
 * ─────────────────────────────────────────────
 * Toutes les requêtes Supabase liées aux livreurs.
 *
 * Règles :
 * - Chaque fonction retourne toujours { data, error } — jamais de throw
 * - Fonctions SERVER → createAdminClient (bypass RLS)
 * - Fonctions CLIENT → createClient (respecte RLS)
 */

import { createAdminClient } from "@/lib/supabase.server";
import { createClient } from "@/lib/client";
import type {
  Courier,
  CourierInsert,
  CourierUpdate,
  CourierWithProfile,
  CourierStatus,
  VehicleType,
  RepositoryResponse,
  RepositoryListResponse,
} from "@/core/types";

// ============================================================
// TYPES LOCAUX — Paramètres de filtrage
// ============================================================

interface GetCouriersFilters {
  status?: CourierStatus;
  vehicleType?: VehicleType;
  /** Pagination — page commence à 1 */
  page?: number;
  /** Nombre d'éléments par page (défaut: 20) */
  perPage?: number;
}

// ============================================================
// REQUÊTES SERVEUR — Admin / Server Actions
// ============================================================

/**
 * Récupère un livreur par son ID avec son profil
 * @example const { data: courier } = await getCourierById(courierId)
 */
export async function getCourierById(
  id: string
): Promise<RepositoryResponse<CourierWithProfile>> {
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("couriers")
    .select(`
      *,
      profile:profiles!couriers_profile_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[CourierRepository] getCourierById:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as unknown as CourierWithProfile, error: null };
}

/**
 * Récupère un livreur par le profile_id de l'utilisateur
 * Utile pour savoir si un utilisateur est livreur
 * @example const { data: courier } = await getCourierByProfileId(userId)
 */
export async function getCourierByProfileId(
  profileId: string
): Promise<RepositoryResponse<CourierWithProfile>> {
  if (!profileId) {
    return { data: null, error: "profileId manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("couriers")
    .select(`
      *,
      profile:profiles!couriers_profile_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      )
    `)
    .eq("profile_id", profileId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[CourierRepository] getCourierByProfileId:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as unknown as CourierWithProfile, error: null };
}

/**
 * Récupère tous les livreurs avec leur profil
 * @example const { data: couriers } = await getAllCouriers({ status: 'available' })
 */
export async function getAllCouriers(
  filters: GetCouriersFilters = {}
): Promise<RepositoryListResponse<CourierWithProfile>> {
  const { status, vehicleType, page = 1, perPage = 20 } = filters;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createAdminClient();

  let query = supabase
    .from("couriers")
    .select(
      `
      *,
      profile:profiles!couriers_profile_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Filtres optionnels
  if (status) query = query.eq("status", status);
  if (vehicleType) query = query.eq("vehicle_type", vehicleType);

  const { data, error, count } = await query;

  if (error) {
    console.error("[CourierRepository] getAllCouriers:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return {
    data: (data as unknown as CourierWithProfile[]) ?? [],
    error: null,
    count: count ?? 0,
  };
}

/**
 * Récupère uniquement les livreurs disponibles
 * Utilisé pour assigner une commande
 * @example const { data: available } = await getAvailableCouriers()
 */
export async function getAvailableCouriers(): Promise<
  RepositoryListResponse<CourierWithProfile>
> {
  const supabase = createAdminClient();

  const { data, error, count } = await supabase
    .from("couriers")
    .select(
      `
      *,
      profile:profiles!couriers_profile_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      )
    `,
      { count: "exact" }
    )
    // Disponible ET profil actif
    .eq("status", "available")
    .eq("profile.is_active", true)
    .order("total_deliveries", { ascending: true }); // Le moins chargé en premier

  if (error) {
    console.error("[CourierRepository] getAvailableCouriers:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return {
    data: (data as unknown as CourierWithProfile[]) ?? [],
    error: null,
    count: count ?? 0,
  };
}

/**
 * Crée un nouveau livreur — ADMIN SEULEMENT
 * Le profil doit déjà exister avec role = 'courier'
 * @example await createCourier({ profile_id: userId, vehicle_type: 'motorcycle' })
 */
export async function createCourier(
  payload: CourierInsert
): Promise<RepositoryResponse<Courier>> {
  if (!payload.profile_id) {
    return { data: null, error: "profile_id manquant" };
  }

  const supabase = createAdminClient();

  // Vérification : le profil existe et a bien le rôle 'courier'
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", payload.profile_id)
    .single();

  if (profileError || !profile) {
    return { data: null, error: "Profil introuvable" };
  }

  if (profile.role !== "courier") {
    return {
      data: null,
      error: "Ce profil n'a pas le rôle 'courier'. Change d'abord le rôle.",
    };
  }

  if (!profile.is_active) {
    return { data: null, error: "Ce profil est désactivé" };
  }

  // Vérification : pas déjà un livreur
  const { data: existing } = await supabase
    .from("couriers")
    .select("id")
    .eq("profile_id", payload.profile_id)
    .single();

  if (existing) {
    return { data: null, error: "Ce profil est déjà un livreur" };
  }

  const { data, error } = await supabase
    .from("couriers")
    .insert({
      ...payload,
      status: "offline", // toujours offline à la création
      total_deliveries: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[CourierRepository] createCourier:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Met à jour les infos d'un livreur — ADMIN SEULEMENT
 * @example await updateCourier(courierId, { vehicle_type: 'car', vehicle_plate: 'AB-123-CD' })
 */
export async function updateCourier(
  id: string,
  updates: CourierUpdate
): Promise<RepositoryResponse<Courier>> {
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  // Empêche de modifier des champs gérés automatiquement
  const {
    id: _id,
    profile_id: _profileId,
    total_deliveries: _total,
    created_at: _created,
    ...safeUpdates
  } = updates;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("couriers")
    .update(safeUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[CourierRepository] updateCourier:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Incrémente le compteur de livraisons et met à jour la note
 * Appelé automatiquement après chaque livraison réussie
 * @example await incrementDeliveryCount(courierId, 4.8)
 */
export async function incrementDeliveryCount(
  courierId: string,
  newRating?: number
): Promise<RepositoryResponse<Courier>> {
  if (!courierId) {
    return { data: null, error: "courierId manquant" };
  }

  const supabase = createAdminClient();

  // On récupère les stats actuelles pour calculer la nouvelle moyenne
  const { data: current, error: fetchError } = await supabase
    .from("couriers")
    .select("total_deliveries, rating")
    .eq("id", courierId)
    .single();

  if (fetchError || !current) {
    return { data: null, error: "Livreur introuvable" };
  }

  const newTotal = current.total_deliveries + 1;

  // Calcul de la nouvelle note moyenne
  let updatedRating = current.rating;
  if (newRating !== undefined) {
    if (current.rating === null) {
      // Première note
      updatedRating = newRating;
    } else {
      // Moyenne pondérée : (ancienne_note * ancien_total + nouvelle_note) / nouveau_total
      updatedRating =
        (current.rating * current.total_deliveries + newRating) / newTotal;
      // On arrondit à 2 décimales
      updatedRating = Math.round(updatedRating * 100) / 100;
    }
  }

  const { data, error } = await supabase
    .from("couriers")
    .update({
      total_deliveries: newTotal,
      rating: updatedRating,
      status: "available", // redevient disponible après livraison
    })
    .eq("id", courierId)
    .select()
    .single();

  if (error) {
    console.error("[CourierRepository] incrementDeliveryCount:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================================
// REQUÊTES CLIENT — Livreur connecté (RLS actif)
// ============================================================

/**
 * Récupère le profil courier de l'utilisateur connecté
 * @example const { data: myCourier } = await getMyCourierProfile()
 */
export async function getMyCourierProfile(): Promise<
  RepositoryResponse<CourierWithProfile>
> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Utilisateur non connecté" };
  }

  const { data, error } = await supabase
    .from("couriers")
    .select(`
      *,
      profile:profiles!couriers_profile_id_fkey (
        id, full_name, email, phone, avatar_url, role, is_active, created_at, updated_at
      )
    `)
    .eq("profile_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[CourierRepository] getMyCourierProfile:", error.message);
    return { data: null, error: error.message };
  }

  return { data: data as unknown as CourierWithProfile, error: null };
}

/**
 * Met à jour le statut du livreur connecté
 * @example await updateMyCourierStatus('available')
 */
export async function updateMyCourierStatus(
  status: CourierStatus
): Promise<RepositoryResponse<Courier>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Utilisateur non connecté" };
  }

  const { data, error } = await supabase
    .from("couriers")
    .update({ status })
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[CourierRepository] updateMyCourierStatus:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Met à jour la position GPS du livreur connecté
 * Appelé régulièrement pendant une livraison (toutes les X secondes)
 * @example await updateMyCourierLocation(48.8566, 2.3522)
 */
export async function updateMyCourierLocation(
  latitude: number,
  longitude: number
): Promise<RepositoryResponse<Courier>> {
  // Validation des coordonnées GPS
  if (latitude < -90 || latitude > 90) {
    return { data: null, error: "Latitude invalide (doit être entre -90 et 90)" };
  }
  if (longitude < -180 || longitude > 180) {
    return { data: null, error: "Longitude invalide (doit être entre -180 et 180)" };
  }

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Utilisateur non connecté" };
  }

  const { data, error } = await supabase
    .from("couriers")
    .update({
      current_lat: latitude,
      current_lng: longitude,
      last_location_at: new Date().toISOString(),
    })
    .eq("profile_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[CourierRepository] updateMyCourierLocation:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
/**
 * infrastructure/supabase/repositories/profile.repository.ts
 * ─────────────────────────────────────────────
 * Toutes les requêtes Supabase liées aux profils utilisateurs.
 *
 * Règles :
 * - Chaque fonction retourne toujours { data, error } — jamais de throw
 * - On log les erreurs mais on les remonte au use-case qui décide quoi faire
 * - Les fonctions SERVER utilisent createAdminClient (bypass RLS)
 * - Les fonctions CLIENT utilisent createClient (respecte RLS)
 */

import { createAdminClient } from "@/lib/supabase.server";
import { createClient } from "@/lib/client";
import type {
  Profile,
  ProfileUpdate,
  UserRole,
  RepositoryResponse,
  RepositoryListResponse,
} from "@/core/types";

// ============================================================
// REQUÊTES SERVEUR (utilisent le client admin — bypass RLS)
// À utiliser uniquement dans : Server Actions, Route Handlers
// ============================================================

/**
 * Récupère un profil par son ID
 * @example const { data: profile } = await getProfileById(userId)
 */
export async function getProfileById(
  id: string
): Promise<RepositoryResponse<Profile>> {
  // Vérification défensive — évite une requête inutile
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single(); // .single() retourne un objet au lieu d'un tableau

  if (error) {
    // PGRST116 = aucune ligne trouvée — c'est pas vraiment une erreur
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[ProfileRepository] getProfileById:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Récupère un profil par son email
 * @example const { data: profile } = await getProfileByEmail('user@example.com')
 */
export async function getProfileByEmail(
  email: string
): Promise<RepositoryResponse<Profile>> {
  if (!email) {
    return { data: null, error: "Email manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[ProfileRepository] getProfileByEmail:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Récupère tous les profils — avec filtre optionnel par rôle
 * @example const { data: couriers } = await getAllProfiles('courier')
 * @example const { data: everyone } = await getAllProfiles()
 */
export async function getAllProfiles(
  role?: UserRole
): Promise<RepositoryListResponse<Profile>> {
  const supabase = createAdminClient();

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" }) // count: 'exact' retourne le total
    .order("created_at", { ascending: false });

  // Filtre par rôle seulement si fourni
  if (role) {
    query = query.eq("role", role);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[ProfileRepository] getAllProfiles:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return { data: data ?? [], error: null, count: count ?? 0 };
}

/**
 * Met à jour un profil
 * @example await updateProfile(userId, { full_name: 'Jean Dupont' })
 */
export async function updateProfile(
  id: string,
  updates: ProfileUpdate
): Promise<RepositoryResponse<Profile>> {
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  // Empêche de modifier des champs sensibles via cette fonction
  const { id: _id, role: _role, created_at: _created, ...safeUpdates } = updates;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update(safeUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[ProfileRepository] updateProfile:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Change le rôle d'un utilisateur — ADMIN SEULEMENT
 * Fonction séparée pour rendre l'intention explicite
 * @example await changeUserRole(userId, 'courier')
 */
export async function changeUserRole(
  id: string,
  newRole: UserRole
): Promise<RepositoryResponse<Profile>> {
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[ProfileRepository] changeUserRole:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Active ou désactive un utilisateur
 * @example await setProfileActive(userId, false) // désactiver
 */
export async function setProfileActive(
  id: string,
  isActive: boolean
): Promise<RepositoryResponse<Profile>> {
  if (!id) {
    return { data: null, error: "ID manquant" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[ProfileRepository] setProfileActive:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================================
// REQUÊTES CLIENT (respectent le RLS — utilisateur connecté)
// À utiliser dans : hooks, composants client
// ============================================================

/**
 * Récupère le profil de l'utilisateur actuellement connecté
 * Utilise le client browser (RLS actif — accès à son propre profil uniquement)
 * @example const { data: me } = await getCurrentProfile()
 */
export async function getCurrentProfile(): Promise<
  RepositoryResponse<Profile>
> {
  const supabase = createClient();

  // D'abord on récupère l'utilisateur connecté
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Utilisateur non connecté" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Profil introuvable" };
    }
    console.error("[ProfileRepository] getCurrentProfile:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Met à jour le profil de l'utilisateur connecté
 * Utilise le client browser (RLS actif — ne peut modifier que le sien)
 * @example await updateCurrentProfile({ full_name: 'Jean Dupont', phone: '+33...' })
 */
export async function updateCurrentProfile(
  updates: Pick<ProfileUpdate, "full_name" | "phone" | "avatar_url">
): Promise<RepositoryResponse<Profile>> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: "Utilisateur non connecté" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[ProfileRepository] updateCurrentProfile:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
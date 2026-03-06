/**
 * modules/couriers/actions/courier.actions.ts
 * ─────────────────────────────────────────────
 * Server Actions pour les mutations du module couriers.
 *
 * ✅ "use server"
 */

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase.server";
import {
  createCourier,
  updateCourier,
} from "@/infrastructure/supabase/repositories/courier.repository";
import {
  updateProfile,
  setProfileActive,
} from "@/infrastructure/supabase/repositories/profile.repository";
import { validateCourierForm, hasFormErrors } from "@/core/entities/courier.entity";
import type { VehicleType, CourierStatus } from "@/core/types";

// ─── Type retour standard ─────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  error: string | null;
  data?: T;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Crée un compte livreur complet depuis zéro.
 * L'admin fournit email + mot de passe — le livreur n'a rien à faire.
 *
 * Flux atomique :
 *  1. Validation des données (form + password)
 *  2. Vérification que l'email n'est pas déjà utilisé
 *  3. Création du compte Supabase Auth (email + password)
 *  4. Création du profil dans public.profiles
 *  5. Création de l'entrée dans public.couriers
 *
 * ⚠️  Utilise createAdminClient (service role key) — SERVER ONLY
 *     Seul le client admin peut créer des users sans confirmation email.
 *
 * ⚠️  Pas de rollback automatique si une étape échoue après Auth.
 *     Si createCourier échoue, le compte Auth existe mais sans profil courier.
 *     → On log l'ID orphelin pour pouvoir le nettoyer manuellement.
 */
export async function createCourierAction(formData: {
  full_name:     string;
  email:         string;
  phone:         string;
  password:      string;
  vehicle_type:  VehicleType;
  vehicle_plate: string;
}): Promise<ActionResult<{ courierId: string }>> {

  // ── 1. Validation des données ─────────────────────────────────────────────

  const errors = validateCourierForm(formData);

  // Validation du mot de passe (en plus de la validation form)
  if (!formData.password || formData.password.length < 8) {
    errors.password = "Le mot de passe doit contenir au moins 8 caractères";
  }

  if (hasFormErrors(errors)) {
    const firstError = Object.values(errors)[0];
    return { success: false, error: firstError ?? "Données invalides" };
  }

  const supabase = createAdminClient();

  // ── 2. Vérifier que l'email n'est pas déjà utilisé ────────────────────────

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const emailAlreadyUsed = existingUsers?.users?.some(
    (u) => u.email?.toLowerCase() === formData.email.toLowerCase().trim()
  );

  if (emailAlreadyUsed) {
    return {
      success: false,
      error: "Un compte existe déjà avec cet email.",
    };
  }

  // ── 3. Créer le compte Supabase Auth ─────────────────────────────────────

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:             formData.email.trim().toLowerCase(),
    password:          formData.password,
    email_confirm:     true,   // Pas besoin de confirmation email
    user_metadata: {
      full_name: formData.full_name.trim(),
      role:      "courier",
    },
  });

  if (authError || !authData.user) {
    console.error("[CourierAction] createUser Auth:", authError?.message);
    return {
      success: false,
      error: authError?.message ?? "Impossible de créer le compte",
    };
  }

  const authUserId = authData.user.id;

  // ── 4. Mettre à jour le profil dans public.profiles ─────────────────────
  //
  // ⚠️  HACK DOCUMENTÉ — trigger caché dans le schéma auth (pas visible dans
  //     information_schema.triggers qui ne liste que le schéma public).
  //
  // Quand auth.admin.createUser() est appelé, Supabase déclenche un trigger
  // sur auth.users qui crée automatiquement une ligne dans public.profiles.
  // Ce profil est créé avec des données minimales (id, email).
  //
  // On fait donc un UPDATE (pas INSERT) pour compléter les infos manquantes :
  // full_name, phone, role = 'courier'.

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: formData.full_name.trim(),
      email:     formData.email.trim().toLowerCase(),
      phone:     formData.phone.trim() || null,
      role:      "courier",
      is_active: true,
    })
    .eq("id", authUserId);

  if (profileError) {
    console.error(
      `[CourierAction] profileError pour authUserId=${authUserId}:`,
      profileError.message
    );
    return {
      success: false,
      error: "Compte créé mais erreur lors de la mise à jour du profil. Contactez le support.",
    };
  }

  // ── 5. Créer l'entrée dans public.couriers ────────────────────────────────

  const { data: courier, error: courierError } = await createCourier({
    profile_id:       authUserId,
    vehicle_type:     formData.vehicle_type,
    vehicle_plate:    formData.vehicle_plate.trim() || null,
    status:           "offline",
    total_deliveries: 0,
  });

  if (courierError || !courier) {
    // ⚠️  Auth + profil existent — on log pour nettoyage
    console.error(
      `[CourierAction] courierError pour profileId=${authUserId}:`,
      courierError
    );
    return {
      success: false,
      error: "Compte créé mais erreur lors de la création du livreur. Contactez le support.",
    };
  }

  revalidatePath("/couriers");

  return { success: true, error: null, data: { courierId: courier.id } };
}

/**
 * Met à jour les informations d'un livreur existant.
 * L'email n'est pas modifiable (identifiant du compte Auth).
 */
export async function updateCourierAction(
  courierId: string,
  profileId: string,
  formData: {
    full_name:     string;
    phone:         string;
    vehicle_type:  VehicleType;
    vehicle_plate: string;
  }
): Promise<ActionResult> {
  if (!courierId || !profileId) {
    return { success: false, error: "IDs manquants" };
  }

  // Validation (email ignoré en mode édition)
  const errors = validateCourierForm({
    ...formData,
    email: "placeholder@skip.com",
  });
  delete errors.email;

  if (hasFormErrors(errors)) {
    const firstError = Object.values(errors)[0];
    return { success: false, error: firstError ?? "Données invalides" };
  }

  // Mise à jour profil
  const { error: profileError } = await updateProfile(profileId, {
    full_name: formData.full_name.trim(),
    phone:     formData.phone.trim() || null,
  });

  if (profileError) {
    return { success: false, error: "Impossible de mettre à jour le profil" };
  }

  // Mise à jour infos livreur
  const { error: courierError } = await updateCourier(courierId, {
    vehicle_type:  formData.vehicle_type,
    vehicle_plate: formData.vehicle_plate.trim() || null,
  });

  if (courierError) {
    return { success: false, error: "Impossible de mettre à jour le livreur" };
  }

  revalidatePath("/couriers");
  revalidatePath(`/couriers/${courierId}`);

  return { success: true, error: null };
}

/**
 * Active ou désactive un livreur.
 * Désactiver → profil is_active = false + status = 'offline'
 * Activer    → profil is_active = true
 */
export async function toggleCourierActiveAction(
  courierId: string,
  profileId: string,
  isActive: boolean
): Promise<ActionResult> {
  if (!courierId || !profileId) {
    return { success: false, error: "IDs manquants" };
  }

  const { error: profileError } = await setProfileActive(profileId, isActive);
  if (profileError) {
    return { success: false, error: "Impossible de modifier le statut du compte" };
  }

  // Si désactivation → forcer offline (non bloquant)
  if (!isActive) {
    const { error: courierError } = await updateCourier(courierId, {
      status: "offline" as CourierStatus,
    });
    if (courierError) {
      console.error("[CourierAction] toggleActive: impossible de passer offline:", courierError);
    }
  }

  revalidatePath("/couriers");
  revalidatePath(`/couriers/${courierId}`);

  return { success: true, error: null };
}

/**
 * Supprime un livreur et son compte complet.
 *
 * Flux de suppression (ordre important — contraintes FK) :
 *  1. Supprime l'entrée dans public.couriers
 *  2. Supprime le profil dans public.profiles
 *  3. Supprime le compte dans auth.users (via admin API)
 *     → Le trigger Supabase cascade et nettoie le reste
 *
 * ⚠️  Action irréversible — confirmation obligatoire côté UI.
 * ⚠️  Utilise createAdminClient (service role) — SERVER ONLY.
 */
export async function deleteCourierAction(
  courierId: string,
  profileId: string
): Promise<ActionResult> {
  if (!courierId || !profileId) {
    return { success: false, error: "IDs manquants" };
  }

  const supabase = createAdminClient();

  // ── 1. Supprimer l'entrée dans public.couriers ────────────────────────────
  // On supprime couriers EN PREMIER à cause de la FK couriers.profile_id → profiles.id
  const { error: courierError } = await supabase
    .from("couriers")
    .delete()
    .eq("id", courierId);

  if (courierError) {
    console.error("[CourierAction] deleteCourier - couriers:", courierError.message);
    return { success: false, error: "Impossible de supprimer le livreur" };
  }

  // ── 2. Supprimer le profil dans public.profiles ───────────────────────────
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (profileError) {
    console.error("[CourierAction] deleteCourier - profiles:", profileError.message);
    return { success: false, error: "Livreur supprimé mais erreur sur le profil. Contactez le support." };
  }

  // ── 3. Supprimer le compte Auth ───────────────────────────────────────────
  // Cette étape supprime l'accès à la plateforme définitivement
  const { error: authError } = await supabase.auth.admin.deleteUser(profileId);

  if (authError) {
    console.error("[CourierAction] deleteCourier - auth:", authError.message);
    // Non bloquant : profil et courier sont déjà supprimés
    // Le compte auth orphelin peut être nettoyé manuellement depuis Supabase
    console.warn(`[CourierAction] Compte auth orphelin à nettoyer manuellement : ${profileId}`);
  }

  revalidatePath("/couriers");

  return { success: true, error: null };
}
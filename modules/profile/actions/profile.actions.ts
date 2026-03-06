"use server";

/**
 * modules/profile/actions/profile.actions.ts
 */

import { revalidatePath }  from "next/cache";
import { createAdminClient } from "@/lib/supabase.server";
import { createSsrClient }   from "@/lib/supabase.ssr";

interface ActionResult { success: boolean; error?: string; }

// ── Mettre à jour les infos personnelles ──────────────────────────────────────
export async function updateProfileAction(
  userId:  string,
  updates: { full_name: string; phone: string | null }
): Promise<ActionResult> {
  const full_name = updates.full_name.trim();
  if (!full_name) return { success: false, error: "Le nom est requis" };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone: updates.phone || null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) { console.error("[ProfileAction] update:", error.message); return { success: false, error: "Erreur lors de la mise à jour" }; }
  revalidatePath("/profile");
  return { success: true };
}

// ── Changer le mot de passe ───────────────────────────────────────────────────
export async function changePasswordAction(
  currentPassword: string,
  newPassword:     string
): Promise<ActionResult> {
  if (!currentPassword) return { success: false, error: "Mot de passe actuel requis" };
  if (newPassword.length < 8) return { success: false, error: "Le nouveau mot de passe doit faire au moins 8 caractères" };

  // Vérifie l'ancien mot de passe en tentant une connexion
  const ssrClient = await createSsrClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  if (!user?.email) return { success: false, error: "Session invalide" };

  const { error: signInError } = await ssrClient.auth.signInWithPassword({
    email:    user.email,
    password: currentPassword,
  });
  if (signInError) return { success: false, error: "Mot de passe actuel incorrect" };

  // Met à jour avec le client admin
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) { console.error("[ProfileAction] changePassword:", error.message); return { success: false, error: "Erreur lors du changement de mot de passe" }; }

  return { success: true };
}

// ── Mettre à jour l'avatar ────────────────────────────────────────────────────
export async function updateAvatarAction(
  userId:    string,
  avatarUrl: string
): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { success: false, error: "Erreur lors de la mise à jour de l'avatar" };
  revalidatePath("/profile");
  return { success: true };
}
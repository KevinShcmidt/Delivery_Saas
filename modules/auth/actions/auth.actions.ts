"use server";

/**
 * modules/auth/actions/auth.actions.ts
 * ─────────────────────────────────────────────
 * Server Actions pour l'authentification.
 * Utilise createSsrClient — cookies set côté serveur avant redirect().
 */

import { redirect } from "next/navigation";
import { createSsrClient } from "@/lib/supabase.ssr";
import { createAdminClient } from "@/lib/supabase.server";
import type { UserRole } from "@/core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionResult<T = null> {
  success: boolean;
  error?:  string;
  data?:   T;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getRedirectPath(role: UserRole): string {
  switch (role) {
    case "admin":   return "/dashboard";
    case "courier": return "/dashboard";
    case "client":  return "/orders";
    default:        return "/dashboard";
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Connexion — appelée depuis LoginForm via useTransition
 * Cookie set côté serveur avant redirect() — bonne pratique Next.js
 */
export async function signInAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const email    = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email)    return { success: false, error: "Email requis" };
  if (!password) return { success: false, error: "Mot de passe requis" };

  const supabase = await createSsrClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError) {
    const messages: Record<string, string> = {
      "Invalid login credentials": "Email ou mot de passe incorrect",
      "Email not confirmed":       "Veuillez confirmer votre email",
      "Too many requests":         "Trop de tentatives, réessayez plus tard",
    };
    return {
      success: false,
      error: messages[authError.message] ?? authError.message,
    };
  }

  if (!authData.user) {
    return { success: false, error: "Erreur lors de la connexion" };
  }

  // Vérifier le profil — is_active + rôle
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "Profil introuvable. Contactez le support." };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { success: false, error: "Votre compte a été désactivé." };
  }

  return { 
    success: true, 
    data: { redirectTo: getRedirectPath(profile.role as UserRole) } 
  };
}

/**
 * Déconnexion
 */
export async function signOutAction(): Promise<ActionResult> {
  const supabase = await createSsrClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Inscription
 */
export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const email           = formData.get("email")?.toString().trim() ?? "";
  const password        = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";
  const fullName        = formData.get("fullName")?.toString().trim() ?? "";
  const role            = (formData.get("role")?.toString() ?? "client") as UserRole;

  if (!email)    return { success: false, error: "Email requis" };
  if (!fullName) return { success: false, error: "Nom complet requis" };
  if (!password) return { success: false, error: "Mot de passe requis" };
  if (password !== confirmPassword) {
    return { success: false, error: "Les mots de passe ne correspondent pas" };
  }

  const supabase = await createSsrClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (error)      return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Erreur lors de la création du compte" };

  redirect(getRedirectPath(role));
}

/**
 * Réinitialisation de mot de passe
 */
export async function resetPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email")?.toString().trim() ?? "";
  if (!email) return { success: false, error: "Email requis" };

  const supabase = await createSsrClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
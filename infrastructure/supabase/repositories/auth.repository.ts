/**
 * infrastructure/supabase/repositories/auth.repository.ts
 */

import type { LoginCredentials, AuthUser } from "@/core/types/auth.types";
import { createClient } from "@/lib/client";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Rôles valides — doivent correspondre EXACTEMENT à l'enum user_role en SQL :
 * CREATE TYPE user_role AS ENUM ('admin', 'courier', 'client')
 */
const VALID_ROLES = ["admin", "courier", "client"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertValidRole(role: unknown, userId: string): ValidRole {
  if (typeof role !== "string" || !VALID_ROLES.includes(role as ValidRole)) {
    throw new Error(
      `[AuthRepository] Rôle invalide "${role}" pour l'utilisateur ${userId}. ` +
        `Rôles autorisés : ${VALID_ROLES.join(", ")}.`
    );
  }
  return role as ValidRole;
}

function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    "Invalid login credentials":  "Email ou mot de passe incorrect.",
    "Email not confirmed":        "Veuillez confirmer votre email avant de vous connecter.",
    "Too many requests":          "Trop de tentatives. Veuillez patienter quelques minutes.",
    "User not found":             "Aucun compte associé à cet email.",
    "Network request failed":     "Problème de connexion réseau. Vérifiez votre connexion internet.",
  };

  const matchedKey = Object.keys(errorMap).find((key) =>
    message.toLowerCase().includes(key.toLowerCase())
  );

  return matchedKey
    ? errorMap[matchedKey]
    : "Une erreur est survenue. Veuillez réessayer.";
}

function mapToAuthUser(
  userId: string,
  email: string,
  profile: { full_name: string | null; role: unknown; is_active: boolean }
): AuthUser {
  if (!profile.is_active) {
    throw new Error("Votre compte a été désactivé. Contactez le support.");
  }

  return {
    id:       userId,
    email,
    role:     assertValidRole(profile.role, userId),
    fullName: profile.full_name ?? undefined,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const AuthRepository = {

  /** Connecte un utilisateur. ✅ CLIENT SIDE */
  async signIn(credentials: LoginCredentials): Promise<AuthUser> {
    // 1. Log immédiat pour voir l'objet brut reçu par la fonction
    console.log("DEBUG: Données reçues dans signIn :", credentials);

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    // 2. Log pour vérifier après le nettoyage (trim/lowercase)
    console.log("DEBUG: Données préparées pour l'envoi :", { email, passwordLength: password?.length });

    const supabase = createClient();


    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    
    // ← Ajoute ces 2 lignes temporairement
    console.log("AUTH ERROR:", error);
    console.log("AUTH DATA:", data);
    
    if (error) throw new Error(translateAuthError(error.message));
    if (!data.user?.email) throw new Error("Connexion échouée. Veuillez réessayer.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, is_active")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Impossible de récupérer le profil utilisateur.");
    }

    return mapToAuthUser(data.user.id, data.user.email, profile);
  },

  /** Déconnecte l'utilisateur. ✅ CLIENT SIDE */
  async signOut(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) console.error("[AuthRepository] Erreur signOut :", error.message);
  },

  /** Session côté client — uniquement pour l'UI non critique. ✅ CLIENT SIDE */
  async getClientSession() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session;
  },
};
/**
 * infrastructure/supabase/repositories/auth.server-repository.ts
 *
 * ✅ SERVER SIDE uniquement — Server Components, Server Actions
 * ❌ Ne jamais importer depuis un composant "use client"
 *
 * Séparé de auth.repository.ts pour éviter que next/headers
 * ne remonte dans la chaîne des composants client.
 */

import type { AuthUser } from "@/core/types/auth.types";
import { createClient } from "@/lib/server";

// ─── Types ───────────────────────────────────────────────────────────────────

const VALID_ROLES = ["admin", "client", "courier"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertValidRole(role: unknown, userId: string): ValidRole {
  if (typeof role !== "string" || !VALID_ROLES.includes(role as ValidRole)) {
    throw new Error(
      `[AuthServerRepository] Rôle invalide "${role}" pour l'utilisateur ${userId}.`
    );
  }
  return role as ValidRole;
}

function mapToAuthUser(
  userId: string,
  email: string,
  profile: { full_name: string | null; role: unknown }
): AuthUser {
  return {
    id: userId,
    email,
    role: assertValidRole(profile.role, userId),
    fullName: profile.full_name ?? undefined,
  };
}

// ─── Repository ──────────────────────────────────────────────────────────────

export const AuthServerRepository = {
  /**
   * Récupère l'utilisateur authentifié côté serveur (JWT vérifié).
   * Retourne null si non connecté ou token expiré.
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user?.email) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Impossible de récupérer le profil utilisateur.");
    }

    return mapToAuthUser(user.id, user.email, profile);
  },
};
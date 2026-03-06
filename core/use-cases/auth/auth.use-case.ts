/**
 * core/use-cases/auth/auth.use-case.ts
 * ─────────────────────────────────────────────
 * Logique métier pour l'authentification.
 *
 * Ce use case orchestre :
 * - Inscription → crée le user Supabase Auth + le profil
 * - Connexion → vérifie que le compte est actif
 * - Récupération du profil connecté
 */

import { createClient } from "@/lib/client";
import { getProfileById } from "@/infrastructure/supabase/repositories/profile.repository";
import type { Profile, UserRole, RepositoryResponse } from "@/core/types";

// ============================================================
// TYPES
// ============================================================

interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
}

interface SignInInput {
  email: string;
  password: string;
}

interface AuthOutput {
  profile: Profile;
}

// ============================================================
// USE CASES
// ============================================================

/**
 * Inscrit un nouvel utilisateur
 * Supabase Auth crée le user → le trigger SQL crée automatiquement le profil
 * @example
 * const { data, error } = await signUpUseCase({
 *   email: 'jean@exemple.com',
 *   password: 'motdepasse',
 *   fullName: 'Jean Dupont',
 *   role: 'client'
 * })
 */
export async function signUpUseCase(
  input: SignUpInput
): Promise<RepositoryResponse<AuthOutput>> {

  // ── Validation des entrées ────────────────────────────────
  if (!input.email?.trim()) {
    return { data: null, error: "Email manquant" };
  }
  if (!input.password) {
    return { data: null, error: "Mot de passe manquant" };
  }
  if (input.password.length < 8) {
    return { data: null, error: "Le mot de passe doit contenir au moins 8 caractères" };
  }
  if (!input.fullName?.trim()) {
    return { data: null, error: "Nom complet manquant" };
  }

  const supabase = createClient();

  // ── Créer le compte Supabase Auth ─────────────────────────
  // Le trigger SQL handle_new_user() créera automatiquement le profil
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        // Ces données sont passées au trigger SQL pour créer le profil
        full_name: input.fullName.trim(),
        role: input.role ?? "client",
        phone: input.phone?.trim() ?? null,
      },
    },
  });

  if (authError) {
    // Traduction des erreurs Supabase en messages lisibles
    const errorMessages: Record<string, string> = {
      "User already registered": "Un compte existe déjà avec cet email",
      "Password should be at least 6 characters": "Le mot de passe est trop court",
      "Unable to validate email address: invalid format": "Format d'email invalide",
    };

    const readableError =
      errorMessages[authError.message] ?? authError.message;
    return { data: null, error: readableError };
  }

  if (!authData.user) {
    return { data: null, error: "Erreur lors de la création du compte" };
  }

  // ── Récupérer le profil créé par le trigger ───────────────
  // On attend un peu que le trigger SQL ait eu le temps de s'exécuter
  await new Promise((resolve) => setTimeout(resolve, 500));

  const { data: profile, error: profileError } = await getProfileById(
    authData.user.id
  );

  if (profileError || !profile) {
    // Le compte Auth est créé mais le profil n'est pas encore disponible
    // Ce n'est pas bloquant — le profil sera là lors de la prochaine connexion
    console.warn("[AuthUseCase] Profil pas encore disponible après inscription");
    return { data: null, error: "Compte créé. Veuillez vous connecter." };
  }

  return { data: { profile }, error: null };
}

/**
 * Connecte un utilisateur existant
 * @example
 * const { data, error } = await signInUseCase({
 *   email: 'jean@exemple.com',
 *   password: 'motdepasse'
 * })
 */
export async function signInUseCase(
  input: SignInInput
): Promise<RepositoryResponse<AuthOutput>> {

  // ── Validation des entrées ────────────────────────────────
  if (!input.email?.trim()) {
    return { data: null, error: "Email manquant" };
  }
  if (!input.password) {
    return { data: null, error: "Mot de passe manquant" };
  }

  const supabase = createClient();

  // ── Connexion via Supabase Auth ───────────────────────────
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

  if (authError) {
    const errorMessages: Record<string, string> = {
      "Invalid login credentials": "Email ou mot de passe incorrect",
      "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter",
      "Too many requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    };

    const readableError =
      errorMessages[authError.message] ?? authError.message;
    return { data: null, error: readableError };
  }

  if (!authData.user) {
    return { data: null, error: "Erreur lors de la connexion" };
  }

  // ── Récupérer le profil de l'utilisateur ──────────────────
  const { data: profile, error: profileError } = await getProfileById(
    authData.user.id
  );

  if (profileError) {
    return { data: null, error: profileError };
  }
  if (!profile) {
    return { data: null, error: "Profil introuvable. Contactez le support." };
  }

  // ── Vérifier que le compte est actif ──────────────────────
  if (!profile.is_active) {
    // On déconnecte immédiatement le compte désactivé
    await supabase.auth.signOut();
    return {
      data: null,
      error: "Votre compte a été désactivé. Contactez le support.",
    };
  }

  return { data: { profile }, error: null };
}

/**
 * Déconnecte l'utilisateur connecté
 * Utilise createSsrClient pour effacer les cookies côté serveur
 */
export async function signOutUseCase(): Promise<RepositoryResponse<null>> {
  const { createSsrClient } = await import("@/lib/supabase.ssr");
  const supabase = await createSsrClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[AuthUseCase] signOut:", error.message);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Récupère le profil de l'utilisateur actuellement connecté
 * Retourne null si personne n'est connecté (pas une erreur)
 * @example const { data: { profile } } = await getCurrentUserUseCase()
 */
export async function getCurrentUserUseCase(): Promise<
  RepositoryResponse<AuthOutput | null>
> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // Pas connecté — c'est normal, pas une erreur
  if (authError || !user) {
    return { data: null, error: null };
  }

  const { data: profile, error: profileError } = await getProfileById(user.id);

  if (profileError) {
    return { data: null, error: profileError };
  }

  if (!profile) {
    return { data: null, error: null };
  }

  return { data: { profile }, error: null };
}
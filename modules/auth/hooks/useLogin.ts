/**
 * useLogin — Hook custom pour gérer la logique de connexion
 * Sépare la logique de l'UI : le formulaire n'a qu'à appeler ce hook
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthRepository } from "@/infrastructure/supabase/repositories/auth.repository";
import type { LoginCredentials, LoginFormState } from "@/core/types/auth.types";

export function useLogin() {
  const router = useRouter();

  const [state, setState] = useState<LoginFormState>({
    isLoading: false,
    error: null,
  });

  async function login(credentials: LoginCredentials) {
    setState({ isLoading: true, error: null });

    try {
      const user = await AuthRepository.signIn(credentials);

      // ✅ Rôles corrects — correspondent à l'enum SQL et aux routes de proxy.ts
      const redirectMap: Record<string, string> = {
        admin:   "/dashboard",
        courier: "/dashboard", // courier → dashboard, pas /couriers
        client:  "/orders",
      };

      const destination = redirectMap[user.role] ?? "/dashboard";

      // ✅ push d'abord — navigation immédiate sans bloquer
      // Le dashboard layout est Server Component, il charge ses propres données
      router.push(destination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Une erreur est survenue.";
      setState({ isLoading: false, error: message });
    }
  }

  function clearError() {
    setState((prev) => ({ ...prev, error: null }));
  }

  return { ...state, login, clearError };
}
/**
 * lib/server.ts
 * ─────────────────────────────────────────────
 * Client Supabase pour les SERVER COMPONENTS, SERVER ACTIONS
 * et ROUTE HANDLERS.
 *
 * ✅ Utilise dans : Server Components, Server Actions, Route Handlers
 * ❌ Ne pas utiliser dans : "use client" components
 *
 * Pourquoi getAll/setAll au lieu de get/set ?
 * → L'ancienne API (get/set) ne synchronise pas correctement tous les
 *   cookies de session Supabase, causant des bugs de déconnexion.
 *   getAll/setAll est l'API officielle recommandée depuis @supabase/ssr v0.4+
 *
 * Exemple d'usage :
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";
import { Database } from "@/core/types/database.types";

export async function createClient() {
  // cookies() est async depuis Next.js 15
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      // Lit TOUS les cookies d'un coup (plus fiable que get individuel)
      getAll() {
        return cookieStore.getAll();
      },

      // Écrit TOUS les cookies modifiés
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll peut être appelé depuis un Server Component (read-only).
          // C'est normal — le Middleware s'occupe du refresh de session.
          // On ignore silencieusement cette erreur.
        }
      },
    },
  });
}
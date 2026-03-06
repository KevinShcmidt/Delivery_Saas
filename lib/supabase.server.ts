import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import { Database } from "@/core/types/database.types";

export function createAdminClient() {
  if (!env.supabase.serviceRoleKey) {
    throw new Error(
      "❌ SUPABASE_SERVICE_ROLE_KEY manquante.\n" +
        "   Ce client ne peut être utilisé que côté serveur avec la service role key."
    );
  }

  return createClient<Database>(
    env.supabase.url,
    env.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // 🛡️ SÉCURITÉ RÉSEAU : On surcharge le fetch global pour forcer un timeout
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            // On s'assure que Next.js ne met pas en cache ces appels admin
            next: { revalidate: 0 }, 
            // ⚡ Si la requête met plus de 5s, on avorte pour libérer le serveur
            signal: options?.signal || AbortSignal.timeout(5000),
          });
        },
      },
    }
  );
}
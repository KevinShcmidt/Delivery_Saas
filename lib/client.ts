/**
 * lib/client.ts
 *
 * Client Supabase pour les Client Components ("use client")
 * Utilise @supabase/ssr côté browser — PAS de next/headers ici
 *
 * ✅ Importable depuis : hooks, composants client, repositories client
 * ❌ Ne jamais importer lib/server.ts depuis un composant client
 */

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "@/core/types/database.types";

/**
 * Crée un client Supabase pour le browser.
 * Lit/écrit les cookies de session automatiquement.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.supabase.url,
    env.supabase.anonKey
  );
}
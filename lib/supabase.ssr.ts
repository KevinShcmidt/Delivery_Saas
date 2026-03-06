/**
 * lib/supabase.ssr.ts
 * Client Supabase pour les SERVER COMPONENTS.
 * Lit les cookies de session via next/headers.
 *
 * ✅ Utilise dans : Server Components, layouts, page.tsx
 * ❌ JAMAIS dans : Client Components ("use client")
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Database } from "@/core/types/database.types";

export async function createSsrClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.supabase.url,
    env.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Normal en Server Components — le proxy gère le refresh
          }
        },
      },
    }
  );
}
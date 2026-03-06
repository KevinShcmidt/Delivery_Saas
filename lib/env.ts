/**
 * lib/env.ts
 * ─────────────────────────────────────────────
 * Centralise et valide toutes les variables d'environnement.
 *
 * ⚠️  IMPORTANT : Ne pas utiliser process.env[dynamicKey] côté client.
 *     Next.js remplace les variables NEXT_PUBLIC_ statiquement au build.
 *     L'accès dynamique via process.env["KEY"] ne fonctionne pas dans le browser.
 *     Il faut accéder directement : process.env.NEXT_PUBLIC_SUPABASE_URL
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validation au démarrage — erreur explicite si manquant
if (!supabaseUrl) {
  throw new Error(
    `❌ Variable d'environnement manquante : "NEXT_PUBLIC_SUPABASE_URL"\n` +
      `   Vérifie ton fichier .env.local`
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    `❌ Variable d'environnement manquante : "NEXT_PUBLIC_SUPABASE_ANON_KEY"\n` +
      `   Vérifie ton fichier .env.local`
  );
}

export const env = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,

    // UNIQUEMENT côté serveur — ne jamais exposer au navigateur
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  app: {
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
} as const;
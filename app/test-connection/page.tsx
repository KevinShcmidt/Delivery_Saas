// app/test-connection/page.tsx
// ⚠️ PAGE TEMPORAIRE — à supprimer après vérification

import { createClient } from "@/lib/client";



export default async function TestConnectionPage() {
  let status: "success" | "error" = "error";
  let message = "";

  try {
    const supabase = createClient();

    // getUser() fait un appel réseau réel vers Supabase Auth
    // Pas besoin de table — ça suffit pour confirmer la connexion
    const { error } = await supabase.auth.getUser();

    // "Auth session missing" = connexion OK, juste pas de session active
    // C'est le comportement attendu quand personne n'est connecté
    if (!error || error.message === "Auth session missing!") {
      status = "success";
      message = "Connexion Supabase établie avec succès ✅";
    } else {
      throw error;
    }
  } catch (err) {
    status = "error";
    message = err instanceof Error ? err.message : "Erreur inconnue";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full">
        <h1 className="text-xl font-bold mb-4 text-gray-800">
          Test de connexion Supabase
        </h1>

        <div
          className={`p-4 rounded-lg text-sm font-medium ${
            status === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          ⚠️ Supprime cette page avant de passer en production.
        </p>
      </div>
    </div>
  );
}
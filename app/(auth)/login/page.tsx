/**
 * Page de Login — /app/(auth)/login/page.tsx
 * 
 * - Server Component : vérifie si l'utilisateur est déjà connecté
 * - Si session active → redirect vers dashboard
 * - Sinon → affiche le formulaire
 */
import { redirect } from "next/navigation";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { Package, Truck, BarChart3 } from "lucide-react";
import { AuthServerRepository } from "@/infrastructure/supabase/repositories/auth.server-repository";

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Connexion | DeliverySaaS",
  description: "Connectez-vous à votre espace de gestion des livraisons.",
};

// ─── Features listées sur la page ─────────────────────────────────────────

const FEATURES = [
  {
    icon: Package,
    title: "Gestion des commandes",
    description: "Suivez chaque colis en temps réel, de l'entrepôt au client final.",
  },
  {
    icon: Truck,
    title: "Flotte de coursiers",
    description: "Gérez vos livreurs, leurs zones et leur disponibilité.",
  },
  {
    icon: BarChart3,
    title: "Analytics avancés",
    description: "Tableaux de bord pour piloter la performance de vos opérations.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function LoginPage() {
  // Vérification de session côté serveur
  const user = await AuthServerRepository.getCurrentUser();
if (user) { redirect("/dashboard"); }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex">
      
      {/* ── Colonne gauche : Branding & Features ──────────────────────── */}
      <aside className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        
        {/* Fond décoratif */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Accent orange en arrière-plan */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-600/5 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 shadow-lg shadow-orange-500/30">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight">
              Delivery<span className="text-orange-500">SaaS</span>
            </span>
          </div>
        </div>

        {/* Texte central */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight">
              Gérez vos
              <br />
              <span className="text-orange-500">livraisons</span>
              <br />
              sans friction.
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-zinc-400">
              La plateforme tout-en-un pour les opérations logistiques
              modernes. Temps réel, fiable, scalable.
            </p>
          </div>

          {/* Features */}
          <ul className="space-y-5">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10">
                    <Icon className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {feature.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer aside */}
        <p className="relative z-10 text-xs text-zinc-600">
          © {new Date().getFullYear()} DeliverySaaS — Tous droits réservés
        </p>
      </aside>

      {/* ── Colonne droite : Formulaire ────────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12">
        
        {/* Logo mobile uniquement */}
        <div className="mb-10 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight">
            Delivery<span className="text-orange-500">SaaS</span>
          </span>
        </div>

        {/* Carte formulaire */}
        <div className="w-full max-w-md">
          
          {/* En-tête */}
          <div className="mb-8 space-y-1">
            <h2 className="text-3xl font-black tracking-tight">
              Bon retour 👋
            </h2>
            <p className="text-sm text-zinc-400">
              Connectez-vous pour accéder à votre espace opérationnel.
            </p>
          </div>

          {/* Formulaire de login */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm shadow-2xl shadow-black/40">
            <LoginForm />
          </div>

          {/* Pied de page formulaire */}
          <p className="mt-6 text-center text-xs text-zinc-600">
            Pas encore de compte ?{" "}
            <a
              href="mailto:contact@deliverysaas.com"
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Contactez votre administrateur
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
"use client";

/**
 * modules/auth/components/LoginForm.tsx
 */

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock } from "lucide-react";
import { signInAction } from "@/modules/auth/actions/auth.actions";
import type { LoginCredentials } from "@/core/types/auth.types";

function validateCredentials(credentials: LoginCredentials): string | null {
  if (!credentials.email.trim()) return "L'email est requis.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) return "Format d'email invalide.";
  if (!credentials.password) return "Le mot de passe est requis.";
  if (credentials.password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
  return null;
}

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [credentials, setCredentials] = useState<LoginCredentials>({ email: "", password: "" });
  const [showPassword, setShowPassword]       = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError]         = useState<string | null>(null);

  const displayError = validationError ?? serverError;

  const handleChange = useCallback(
    (field: keyof LoginCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({ ...prev, [field]: e.target.value }));
      setValidationError(null);
      setServerError(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const localError = validateCredentials(credentials);
      if (localError) { setValidationError(localError); return; }

      const formData = new FormData();
      formData.set("email", credentials.email.trim().toLowerCase());
      formData.set("password", credentials.password);

      startTransition(async () => {
        const result = await signInAction(formData);

        if (result.success && result.data?.redirectTo) {
          // ✅ Bonne pratique App Router — router.push au lieu de window.location.href
          router.push(result.data.redirectTo);
          return;
        }

        if (!result.success) {
          setServerError(result.error ?? "Une erreur est survenue.");
        }
      });
    },
    [credentials, router]
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {displayError && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Adresse email
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="email" type="email" autoComplete="email"
            value={credentials.email} onChange={handleChange("email")}
            disabled={isPending} placeholder="vous@entreprise.com"
            className={[
              "w-full rounded-lg border bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white",
              "placeholder:text-zinc-600 outline-none transition-all duration-200",
              "focus:ring-2 focus:ring-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50",
              displayError ? "border-red-500/50" : "border-zinc-700 hover:border-zinc-600 focus:border-orange-500/50",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
            value={credentials.password} onChange={handleChange("password")}
            disabled={isPending} placeholder="••••••••"
            className={[
              "w-full rounded-lg border bg-zinc-900 py-3 pl-10 pr-12 text-sm text-white",
              "placeholder:text-zinc-600 outline-none transition-all duration-200",
              "focus:ring-2 focus:ring-orange-500/50 disabled:cursor-not-allowed disabled:opacity-50",
              displayError ? "border-red-500/50" : "border-zinc-700 hover:border-zinc-600 focus:border-orange-500/50",
            ].join(" ")}
          />
          <button
            type="button" onClick={() => setShowPassword((v) => !v)} disabled={isPending}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors disabled:cursor-not-allowed"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mot de passe oublié */}
      <div className="flex justify-end">
        <a href="/forgot-password" className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">
          Mot de passe oublié ?
        </a>
      </div>

      {/* Submit */}
      <button
        type="submit" disabled={isPending}
        className="relative w-full overflow-hidden rounded-lg bg-orange-500 py-3.5 text-sm font-bold uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:bg-orange-400 hover:shadow-orange-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connexion en cours…
          </span>
        ) : "Se connecter"}
      </button>
    </form>
  );
}
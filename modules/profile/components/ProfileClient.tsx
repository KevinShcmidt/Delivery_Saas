"use client";

/**
 * modules/profile/components/ProfileClient.tsx
 * Page profil complète — infos, avatar, mot de passe, historique connexions
 */

import { useState, useTransition, useRef } from "react";
import { toast }   from "sonner";
import { User, Phone, Mail, Lock, Camera, Shield, Clock, CheckCircle, AlertCircle } from "lucide-react";
import {
  updateProfileAction,
  changePasswordAction,
  updateAvatarAction,
} from "@/modules/profile/actions/profile.actions";
import { createClient } from "@/lib/client";
import type { ProfileData } from "@/modules/profile/queries/profile.queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin:    "Administrateur",
  courier:  "Livreur",
  client:   "Client",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: any; children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-indigo-500/60" />
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
        <Icon className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function InputField({ label, icon: Icon, error, ...props }: {
  label: string; icon: any; error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
        <input
          {...props}
          className={[
            "w-full bg-zinc-800 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100",
            "placeholder:text-zinc-600 outline-none transition-colors",
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-zinc-700 focus:border-indigo-500/60",
            props.disabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ─── Section Avatar ───────────────────────────────────────────────────────────

function AvatarSection({ profile }: { profile: ProfileData }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifie taille et type
    if (file.size > 2 * 1024 * 1024) { toast.error("Image trop lourde (max 2 Mo)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Format invalide"); return; }

    setUploading(true);
    const supabase  = createClient();
    const ext       = file.name.split(".").pop();
    const path      = `avatars/${profile.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur upload : " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(urlWithCacheBust);

    startTransition(async () => {
      const result = await updateAvatarAction(profile.id, urlWithCacheBust);
      if (result.success) toast.success("Avatar mis à jour");
      else toast.error(result.error);
      setUploading(false);
    });
  }

  return (
    <div className="flex items-center gap-6">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-indigo-400">{getInitials(profile.full_name)}</span>
          )}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || isPending}
          className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5 text-white" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Infos rapides */}
      <div>
        <p className="text-base font-bold text-zinc-100">{profile.full_name}</p>
        <p className="text-sm text-zinc-500 mt-0.5">{profile.email}</p>
        <span className="inline-flex mt-2 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg">
          {ROLE_LABELS[profile.role] ?? profile.role}
        </span>
      </div>
    </div>
  );
}

// ─── Section Infos personnelles ───────────────────────────────────────────────

function PersonalInfoSection({ profile }: { profile: ProfileData }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone]       = useState(profile.phone ?? "");
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Le nom est requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await updateProfileAction(profile.id, {
        full_name: fullName,
        phone:     phone || null,
      });
      if (result.success) toast.success("Profil mis à jour");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <InputField
        label="Nom complet"
        icon={User}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        error={errors.fullName}
        placeholder="Jean Dupont"
      />
      <InputField
        label="Email"
        icon={Mail}
        value={profile.email}
        disabled
        placeholder="email@example.com"
        type="email"
      />
      <InputField
        label="Téléphone"
        icon={Phone}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+261 34 00 000 00"
        type="tel"
      />
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

// ─── Section Mot de passe ─────────────────────────────────────────────────────

function PasswordSection() {
  const [current, setCurrent]     = useState("");
  const [newPass, setNewPass]     = useState("");
  const [confirm, setConfirm]     = useState("");
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function validate() {
    const e: Record<string, string> = {};
    if (!current) e.current = "Requis";
    if (newPass.length < 8) e.newPass = "Minimum 8 caractères";
    if (newPass !== confirm) e.confirm = "Les mots de passe ne correspondent pas";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await changePasswordAction(current, newPass);
      if (result.success) {
        toast.success("Mot de passe changé avec succès");
        setCurrent(""); setNewPass(""); setConfirm("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <InputField
        label="Mot de passe actuel"
        icon={Lock}
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={errors.current}
        placeholder="••••••••"
      />
      <InputField
        label="Nouveau mot de passe"
        icon={Lock}
        type="password"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        error={errors.newPass}
        placeholder="Minimum 8 caractères"
      />
      <InputField
        label="Confirmer le mot de passe"
        icon={Lock}
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
        placeholder="••••••••"
      />
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Shield className="w-4 h-4" />
          )}
          Changer le mot de passe
        </button>
      </div>
    </div>
  );
}

// ─── Section Historique ───────────────────────────────────────────────────────

function HistorySection({ profile }: { profile: ProfileData }) {
  const events = [
    { label: "Compte créé",           date: profile.created_at, icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10" },
    { label: "Dernière modification", date: profile.updated_at, icon: Clock,       color: "text-indigo-400 bg-indigo-500/10"   },
  ];

  return (
    <div className="space-y-3">
      {events.map((ev) => (
        <div key={ev.label} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <div className={["w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", ev.color].join(" ")}>
            <ev.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">{ev.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{formatDate(ev.date)}</p>
          </div>
        </div>
      ))}

      {/* Infos compte */}
      <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-400 bg-amber-500/10">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">Statut du compte</p>
          <p className="text-xs mt-0.5">
            <span className={profile.is_active ? "text-emerald-400" : "text-red-400"}>
              {profile.is_active ? "Actif" : "Désactivé"}
            </span>
            <span className="text-zinc-600 ml-2">· ID : {profile.id.slice(0, 8)}…</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProfileClient({ profile }: { profile: ProfileData }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Mon profil</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      {/* Avatar + identité */}
      <SectionCard title="Identité" icon={User}>
        <AvatarSection profile={profile} />
      </SectionCard>

      {/* Infos personnelles */}
      <SectionCard title="Informations personnelles" icon={User}>
        <PersonalInfoSection profile={profile} />
      </SectionCard>

      {/* Sécurité */}
      <SectionCard title="Sécurité" icon={Shield}>
        <PasswordSection />
      </SectionCard>

      {/* Historique */}
      <SectionCard title="Historique du compte" icon={Clock}>
        <HistorySection profile={profile} />
      </SectionCard>
    </div>
  );
}
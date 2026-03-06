/**
 * modules/couriers/components/courier-form/CourierForm.tsx
 * Dark mode — style FleetOps
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  validateCourierForm,
  hasFormErrors,
  type CourierFormErrors,
} from "@/core/entities/courier.entity";
import { VEHICLE_TYPE_LABELS } from "@/core/types";
import {
  createCourierAction,
  updateCourierAction,
} from "@/modules/couriers/actions/courier.actions";
import type { CourierWithProfile, VehicleType } from "@/core/types";

type CourierFormMode = "create" | "edit";

interface CourierFormProps {
  mode: CourierFormMode;
  courier?: CourierWithProfile;
  onSuccess?: () => void;
}

function getInitialValues(courier?: CourierWithProfile) {
  if (!courier) {
    return { full_name: "", email: "", phone: "", password: "", vehicle_type: "motorcycle" as VehicleType, vehicle_plate: "" };
  }
  return {
    full_name: courier.profile.full_name, email: courier.profile.email,
    phone: courier.profile.phone ?? "", password: "",
    vehicle_type: courier.vehicle_type, vehicle_plate: courier.vehicle_plate ?? "",
  };
}

export function CourierForm({ mode, courier, onSuccess }: CourierFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues]             = useState(getInitialValues(courier));
  const [errors, setErrors]             = useState<CourierFormErrors>({});
  const [serverError, setServerError]   = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(field: keyof typeof values, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof CourierFormErrors]) {
      setErrors((prev) => { const next = { ...prev }; delete next[field as keyof CourierFormErrors]; return next; });
    }
  }

  function handleSubmit() {
    const validationErrors: CourierFormErrors = { ...validateCourierForm(values) };
    if (mode === "create") {
      if (!values.password) validationErrors.password = "Le mot de passe est requis";
      else if (values.password.length < 8) validationErrors.password = "Minimum 8 caractères";
    }
    if (mode === "edit") { delete validationErrors.email; delete validationErrors.password; }

    if (hasFormErrors(validationErrors)) { setErrors(validationErrors); return; }

    setErrors({});
    setServerError(null);

    startTransition(async () => {
      const result = mode === "create"
        ? await createCourierAction({ full_name: values.full_name, email: values.email, phone: values.phone, password: values.password, vehicle_type: values.vehicle_type, vehicle_plate: values.vehicle_plate })
        : await updateCourierAction(courier!.id, courier!.profile_id, { full_name: values.full_name, phone: values.phone, vehicle_type: values.vehicle_type, vehicle_plate: values.vehicle_plate });

      if (!result.success) { setServerError(result.error ?? "Une erreur est survenue"); return; }
      onSuccess?.();
      if (mode === "create" && result.data?.courierId) router.push(`/couriers/${result.data.courierId}`);
      else router.refresh();
    });
  }

  const vehicleOptions = Object.entries(VEHICLE_TYPE_LABELS) as Array<[VehicleType, string]>;
  const inputBase = "w-full px-3 py-2.5 text-sm bg-zinc-800 border rounded-lg transition-all focus:outline-none focus:ring-1 text-zinc-200 placeholder-zinc-600";
  const inputOk   = "border-zinc-700 hover:border-zinc-600 focus:border-indigo-500 focus:ring-indigo-500/30";
  const inputErr  = "border-red-700/60 bg-red-950/20 text-red-300 focus:border-red-500 focus:ring-red-500/20";
  const inputDis  = "border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed";

  function ic(hasErr: boolean, disabled = false) {
    return [inputBase, disabled ? inputDis : hasErr ? inputErr : inputOk].join(" ");
  }

  return (
    <div className="space-y-6">
      {serverError && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-3">
          <span className="text-red-400 mt-0.5 flex-shrink-0">⚠️</span>
          <p className="text-sm text-red-300">{serverError}</p>
        </div>
      )}

      {/* Section : Infos personnelles */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2">
            Informations personnelles
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <Field label="Nom complet" required error={errors.full_name}>
          <input id="full_name" type="text" placeholder="Jean Rakoto" value={values.full_name}
            onChange={(e) => handleChange("full_name", e.target.value)} disabled={isPending}
            className={ic(!!errors.full_name)} />
        </Field>

        <Field label="Email" required={mode === "create"} hint={mode === "edit" ? "Non modifiable" : undefined} error={errors.email}>
          <input id="email" type="email" placeholder="livreur@example.com" value={values.email}
            onChange={(e) => handleChange("email", e.target.value)} disabled={isPending || mode === "edit"}
            className={ic(!!errors.email, mode === "edit")} />
        </Field>

        <Field label="Téléphone" hint="Optionnel" error={errors.phone}>
          <input id="phone" type="tel" placeholder="+261 34 00 000 00" value={values.phone}
            onChange={(e) => handleChange("phone", e.target.value)} disabled={isPending}
            className={ic(!!errors.phone)} />
        </Field>

        {mode === "create" && (
          <Field label="Mot de passe" required hint="8 caractères minimum" error={errors.password}>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                value={values.password} onChange={(e) => handleChange("password", e.target.value)}
                disabled={isPending} className={[ic(!!errors.password), "pr-10"].join(" ")} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </Field>
        )}
      </div>

      {/* Section : Véhicule */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2">
            Véhicule
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <Field label="Type de véhicule" required error={errors.vehicle_type}>
          <select value={values.vehicle_type} onChange={(e) => handleChange("vehicle_type", e.target.value)}
            disabled={isPending} className={ic(!!errors.vehicle_type)}>
            {vehicleOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        <Field label="Plaque d'immatriculation" hint="Optionnel" error={errors.vehicle_plate}>
          <input id="vehicle_plate" type="text" placeholder="123 ABC TNR"
            value={values.vehicle_plate}
            onChange={(e) => handleChange("vehicle_plate", e.target.value.toUpperCase())}
            disabled={isPending} className={[ic(!!errors.vehicle_plate), "font-mono uppercase"].join(" ")} />
        </Field>
      </div>

      {/* Boutons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800">
        <button type="button" onClick={() => router.back()} disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50">
          Annuler
        </button>
        <button type="button" onClick={handleSubmit} disabled={isPending}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {mode === "create" ? "Créer le livreur" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-400">
          {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-zinc-600">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
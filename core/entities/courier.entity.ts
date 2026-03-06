/**
 * core/entities/courier.entity.ts
 * Entité métier "Courier" — logique pure, aucune dépendance externe.
 */

import type { CourierWithProfile, CourierStatus, VehicleType } from "@/core/types";
import {
  COURIER_STATUS_LABELS,
  COURIER_STATUS_COLORS,
  VEHICLE_TYPE_LABELS,
} from "@/core/types";

export { COURIER_STATUS_LABELS, COURIER_STATUS_COLORS, VEHICLE_TYPE_LABELS };

export const COURIER_STATUS_BADGE_COLORS: Record<
  CourierStatus,
  { bg: string; text: string; dot: string }
> = {
  offline:   { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
  available: { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  busy:      { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
} as const;

// ─── Règles métier ────────────────────────────────────────────────────────────

export function isCourierAssignable(courier: CourierWithProfile): boolean {
  return courier.status === "available" && courier.profile.is_active === true;
}

export function isCourierActive(courier: CourierWithProfile): boolean {
  return courier.status !== "offline" && courier.profile.is_active === true;
}

// ─── Transformations d'affichage ──────────────────────────────────────────────

export function getCourierDisplayName(courier: CourierWithProfile): string {
  return courier.profile.full_name?.trim() || "Livreur sans nom";
}

export function getCourierStatusLabel(status: CourierStatus): string {
  return COURIER_STATUS_LABELS[status] ?? status;
}

/**
 * Retourne uniquement le label texte du véhicule — sans emoji.
 * Les icônes sont gérées par les composants React via Lucide.
 * @example getVehicleLabel('motorcycle') → "Moto"
 */
export function getVehicleLabel(vehicleType: VehicleType): string {
  return VEHICLE_TYPE_LABELS[vehicleType] ?? vehicleType;
}

/**
 * Retourne la note formatée — sans emoji étoile.
 * L'icône Star de Lucide est affichée par les composants React.
 * @example formatCourierRating(4.756) → "4.8 / 5"
 * @example formatCourierRating(null)  → "Pas encore noté"
 */
export function formatCourierRating(rating: number | null): string {
  if (rating === null) return "Pas encore noté";
  return `${rating.toFixed(1)} / 5`;
}

export function formatCourierLocation(lat: number | null, lng: number | null): string {
  if (lat === null || lng === null) return "Position inconnue";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatLastLocationTime(lastLocationAt: string | null): string {
  if (!lastLocationAt) return "Jamais mis à jour";
  const diffMs      = new Date().getTime() - new Date(lastLocationAt).getTime();
  if (diffMs < 0)              return "À l'instant";
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours   = Math.floor(diffMs / 3_600_000);
  const diffDays    = Math.floor(diffMs / 86_400_000);
  if (diffMinutes < 1)  return "À l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffHours   < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface CourierFormErrors {
  full_name?:     string;
  email?:         string;
  phone?:         string;
  vehicle_type?:  string;
  vehicle_plate?: string;
  password?:      string;
}

export function validateCourierForm(data: {
  full_name:     string;
  email:         string;
  phone:         string;
  vehicle_type:  string;
  vehicle_plate: string;
}): CourierFormErrors {
  const errors: CourierFormErrors = {};

  if (!data.full_name.trim())            errors.full_name    = "Le nom complet est requis";
  else if (data.full_name.trim().length < 2) errors.full_name = "Le nom doit contenir au moins 2 caractères";

  if (!data.email.trim())                errors.email = "L'email est requis";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Format d'email invalide";

  if (data.phone && !/^\+?[\d\s\-().]{8,}$/.test(data.phone)) errors.phone = "Format de téléphone invalide";

  const validVehicles: VehicleType[] = ["bike", "motorcycle", "car", "truck"];
  if (!validVehicles.includes(data.vehicle_type as VehicleType)) errors.vehicle_type = "Type de véhicule invalide";

  return errors;
}

export function hasFormErrors(errors: CourierFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
/**
 * core/entities/courier.entity.ts
 * ─────────────────────────────────────────────
 * Entité métier "Courier" — logique pure, aucune dépendance externe.
 * Pas de Supabase, pas de fetch, pas de React.
 *
 * ⚠️  Les constantes de labels/couleurs viennent de @/core/types/index.ts
 *     On ne les redéfinit PAS ici — on les réexporte pour les composants
 *     qui n'importent que depuis cette entité.
 */

import type { CourierWithProfile, CourierStatus, VehicleType } from "@/core/types";
import {
  COURIER_STATUS_LABELS,
  COURIER_STATUS_COLORS,
  VEHICLE_TYPE_LABELS,
} from "@/core/types";

// ─── Réexports pratiques ──────────────────────────────────────────────────────
// Les composants qui importent depuis l'entité n'ont pas besoin d'aller
// chercher les constantes dans core/types directement.

export { COURIER_STATUS_LABELS, COURIER_STATUS_COLORS, VEHICLE_TYPE_LABELS };

// ─── Constantes locales à l'entité ───────────────────────────────────────────
// Ces constantes ne sont pas dans core/types car elles sont spécifiques
// à la logique d'affichage de l'entité courier.

/** Icônes emoji pour les véhicules — vehicle_type DB : 'bike' | 'motorcycle' | 'car' | 'truck' */
export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  bike:       "🚴",
  motorcycle: "🏍️",
  car:        "🚗",
  truck:      "🚚",
} as const;

/**
 * Couleurs Tailwind détaillées pour les badges de statut livreur.
 * Plus granulaire que COURIER_STATUS_COLORS (qui est bg+text en une string).
 * Utilisé par CourierStatusBadge pour le dot animé.
 */
export const COURIER_STATUS_BADGE_COLORS: Record<
  CourierStatus,
  { bg: string; text: string; dot: string }
> = {
  offline:   { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400"   },
  available: { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  busy:      { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
} as const;

// ─── Règles métier ────────────────────────────────────────────────────────────

/**
 * Vérifie si un livreur peut recevoir une nouvelle commande.
 * Conditions : status = 'available' ET profil actif.
 */
export function isCourierAssignable(courier: CourierWithProfile): boolean {
  return courier.status === "available" && courier.profile.is_active === true;
}

/**
 * Vérifie si un livreur est actuellement en activité (pas offline).
 */
export function isCourierActive(courier: CourierWithProfile): boolean {
  return courier.status !== "offline" && courier.profile.is_active === true;
}

// ─── Transformations d'affichage ──────────────────────────────────────────────

/**
 * Retourne le nom complet du livreur depuis son profil.
 * Fallback si le nom est vide.
 */
export function getCourierDisplayName(courier: CourierWithProfile): string {
  return courier.profile.full_name?.trim() || "Livreur sans nom";
}

/**
 * Retourne le label du statut en français.
 * @example getCourierStatusLabel('available') → "Disponible"
 */
export function getCourierStatusLabel(status: CourierStatus): string {
  return COURIER_STATUS_LABELS[status] ?? status;
}

/**
 * Retourne le label du véhicule avec son icône emoji.
 * Utilise les vraies valeurs DB : 'bike' | 'motorcycle' | 'car' | 'truck'
 * @example getVehicleLabel('motorcycle') → "🏍️ Moto"
 */
export function getVehicleLabel(vehicleType: VehicleType): string {
  const icon  = VEHICLE_TYPE_ICONS[vehicleType]  ?? "🚗";
  const label = VEHICLE_TYPE_LABELS[vehicleType] ?? vehicleType;
  return `${icon} ${label}`;
}

/**
 * Formate la note du livreur pour l'affichage.
 * @example formatCourierRating(4.756) → "4.8 ⭐"
 * @example formatCourierRating(null)  → "Pas encore noté"
 */
export function formatCourierRating(rating: number | null): string {
  if (rating === null) return "Pas encore noté";
  return `${rating.toFixed(1)} ⭐`;
}

/**
 * Formate la position GPS pour l'affichage.
 * @example formatCourierLocation(48.85, 2.35) → "48.850000, 2.350000"
 * @example formatCourierLocation(null, null)  → "Position inconnue"
 */
export function formatCourierLocation(
  lat: number | null,
  lng: number | null
): string {
  if (lat === null || lng === null) return "Position inconnue";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Calcule depuis combien de temps la position a été mise à jour.
 * @example formatLastLocationTime('2024-01-01T10:00:00Z') → "il y a 3 min"
 */
export function formatLastLocationTime(lastLocationAt: string | null): string {
  if (!lastLocationAt) return "Jamais mis à jour";

  const now     = new Date();
  const last    = new Date(lastLocationAt);
  const diffMs  = now.getTime() - last.getTime();

  // Date dans le futur — cas invalide/données corrompues
  if (diffMs < 0) return "À l'instant";

  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours   = Math.floor(diffMs / 3_600_000);
  const diffDays    = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1)  return "À l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffHours   < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

// ─── Validation des données de formulaire ─────────────────────────────────────

export interface CourierFormErrors {
    full_name?:     string;
    email?:         string;
    phone?:         string;
    vehicle_type?:  string;
    vehicle_plate?: string;
    password?:      string;
  }
/**
 * Valide les données du formulaire de création/édition d'un livreur.
 * Retourne un objet d'erreurs — vide si tout est valide.
 *
 * ⚠️  Utilise les vraies valeurs DB pour vehicle_type :
 *     'bike' | 'motorcycle' | 'car' | 'truck'
 */
export function validateCourierForm(data: {
  full_name:     string;
  email:         string;
  phone:         string;
  vehicle_type:  string;
  vehicle_plate: string;
}): CourierFormErrors {
  const errors: CourierFormErrors = {};

  if (!data.full_name.trim()) {
    errors.full_name = "Le nom complet est requis";
  } else if (data.full_name.trim().length < 2) {
    errors.full_name = "Le nom doit contenir au moins 2 caractères";
  }

  if (!data.email.trim()) {
    errors.email = "L'email est requis";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Format d'email invalide";
  }

  if (data.phone && !/^\+?[\d\s\-().]{8,}$/.test(data.phone)) {
    errors.phone = "Format de téléphone invalide";
  }

  // ✅ Valeurs exactes de l'enum vehicle_type en DB
  const validVehicles: VehicleType[] = ["bike", "motorcycle", "car", "truck"];
  if (!validVehicles.includes(data.vehicle_type as VehicleType)) {
    errors.vehicle_type = "Type de véhicule invalide";
  }

  return errors;
}

/**
 * Vérifie si un objet d'erreurs contient au moins une erreur.
 */
export function hasFormErrors(errors: CourierFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
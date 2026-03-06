/**
 * core/types/index.ts
 * ─────────────────────────────────────────────
 * Types métier de l'application.
 *
 * On dérive TOUT depuis database.types.ts (généré par Supabase).
 * Comme ça si la base change → on regénère database.types.ts
 * → les erreurs TypeScript apparaissent automatiquement partout.
 *
 * Principe :
 *   Tables<'orders'>        → le type complet d'une ligne (Row)
 *   TablesInsert<'orders'>  → ce qu'on envoie pour créer
 *   TablesUpdate<'orders'>  → ce qu'on envoie pour modifier
 *   Enums<'order_status'>   → les valeurs possibles d'un enum
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from "./database.types";

// ============================================================
// ENUMS — Les valeurs possibles (dérivées de la DB)
// ============================================================

/** Rôles utilisateur : 'admin' | 'courier' | 'client' */
export type UserRole = Enums<"user_role">;

/** Statuts d'une commande : 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'cancelled' */
export type OrderStatus = Enums<"order_status">;

/** Statuts d'un livreur : 'available' | 'busy' | 'offline' */
export type CourierStatus = Enums<"courier_status">;

/** Types de véhicule : 'bike' | 'motorcycle' | 'car' | 'truck' */
export type VehicleType = Enums<"vehicle_type">;

/** Types d'événement de tracking : 'status_change' | 'location_update' */
export type TrackingEventType = Enums<"tracking_event_type">;

/** Types de notification */
export type NotificationType = Enums<"notification_type">;

// ============================================================
// ENTITÉS — Les types de base (une ligne dans la DB)
// ============================================================

/** Un utilisateur (admin, livreur ou client) */
export type Profile = Tables<"profiles">;

/** Un livreur (extension d'un profil avec role = 'courier') */
export type Courier = Tables<"couriers">;

/** Une commande */
export type Order = Tables<"orders">;

/** Un article dans une commande */
export type OrderItem = Tables<"order_items">;

/** Un événement de tracking (GPS ou changement de statut) */
export type OrderTracking = Tables<"order_tracking">;

/** Une notification */
export type Notification = Tables<"notifications">;

// ============================================================
// TYPES D'INSERTION — Ce qu'on envoie pour CRÉER
// ============================================================

export type ProfileInsert = TablesInsert<"profiles">;
export type CourierInsert = TablesInsert<"couriers">;
export type OrderInsert = TablesInsert<"orders">;
export type OrderItemInsert = TablesInsert<"order_items">;
export type OrderTrackingInsert = TablesInsert<"order_tracking">;
export type NotificationInsert = TablesInsert<"notifications">;

// ============================================================
// TYPES DE MISE À JOUR — Ce qu'on envoie pour MODIFIER
// ============================================================

export type ProfileUpdate = TablesUpdate<"profiles">;
export type CourierUpdate = TablesUpdate<"couriers">;
export type OrderUpdate = TablesUpdate<"orders">;
export type OrderItemUpdate = TablesUpdate<"order_items">;
export type NotificationUpdate = TablesUpdate<"notifications">;

// ============================================================
// TYPES ENRICHIS — Données jointes pour l'affichage
// (quand on fait un SELECT avec des relations)
// ============================================================

/**
 * Livreur avec son profil inclus
 * Utilisé dans les listes admin et la carte de tracking
 */
export type CourierWithProfile = Courier & {
  profile: Profile;
};

/**
 * Commande avec toutes ses relations
 * Utilisé dans la page détail d'une commande
 */
export type OrderWithDetails = Order & {
  client: Profile;
  courier: CourierWithProfile | null;  // null si pas encore assigné
  items: OrderItem[];
  tracking: OrderTracking[];
};

/**
 * Commande avec juste le client et le livreur
 * Utilisé dans les listes (plus léger que OrderWithDetails)
 */
export type OrderWithParties = Order & {
  client: Pick<Profile, "id" | "full_name" | "phone" | "avatar_url">;
  courier: (Pick<Courier, "id" | "status" | "vehicle_type"> & {
    profile: Pick<Profile, "id" | "full_name" | "phone" | "avatar_url">;
  }) | null;
};

/**
 * Notification avec la commande concernée
 * Utilisé dans le centre de notifications
 */
export type NotificationWithOrder = Notification & {
  order: Pick<Order, "id" | "order_number" | "status"> | null;
};

// ============================================================
// TYPES DE RÉPONSE — Format standard retourné par les repositories
// Inspiré du pattern Result/Either pour gérer les erreurs proprement
// ============================================================

/**
 * Réponse standard avec une seule entité
 * @example const { data, error } = await orderRepository.findById(id)
 */
export type RepositoryResponse<T> = {
  data: T | null;
  error: string | null;
};

/**
 * Réponse standard avec une liste d'entités
 * @example const { data, error, count } = await orderRepository.findAll()
 */
export type RepositoryListResponse<T> = {
  data: T[];
  error: string | null;
  count: number;
};

// ============================================================
// CONSTANTES — Labels lisibles pour l'interface
// ============================================================

/** Labels français pour les statuts de commande */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:    "En attente",
  assigned:   "Assignée",
  in_transit: "En cours",
  delivered:  "Livrée",
  failed:     "Échouée",
  cancelled:  "Annulée",
} as const;

/** Couleurs Tailwind pour les badges de statut commande */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:    "bg-yellow-100 text-yellow-800",
  assigned:   "bg-blue-100 text-blue-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered:  "bg-green-100 text-green-800",
  failed:     "bg-red-100 text-red-800",
  cancelled:  "bg-gray-100 text-gray-800",
} as const;

/** Labels français pour les statuts de livreur */
export const COURIER_STATUS_LABELS: Record<CourierStatus, string> = {
  available: "Disponible",
  busy:      "En livraison",
  offline:   "Hors ligne",
} as const;

/** Couleurs Tailwind pour les badges de statut livreur */
export const COURIER_STATUS_COLORS: Record<CourierStatus, string> = {
  available: "bg-green-100 text-green-800",
  busy:      "bg-orange-100 text-orange-800",
  offline:   "bg-gray-100 text-gray-800",
} as const;

/** Labels français pour les types de véhicule */
export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  bike:       "Vélo",
  motorcycle: "Moto",
  car:        "Voiture",
  truck:      "Camion",
} as const;

/** Labels français pour les rôles */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin:   "Administrateur",
  courier: "Livreur",
  client:  "Client",
} as const;

// ============================================================
// TYPES UI / FILTRES — Utilisés dans les composants et queries
// ============================================================

/**
 * Filtres pour la liste des livreurs
 * Utilisé dans fetchCouriersList() et CourierFiltersBar
 */
export type CourierFilters = {
  status?:      CourierStatus | "all";
  vehicleType?: VehicleType | "all";
  search?:      string;
  page?:        number;
  perPage?:     number;
};
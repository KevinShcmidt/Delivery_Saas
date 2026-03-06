/**
 * infrastructure/supabase/repositories/notification.repository.ts
 * ─────────────────────────────────────────────
 * Toutes les requêtes Supabase liées aux notifications.
 *
 * Règles :
 * - Chaque fonction retourne toujours { data, error } — jamais de throw
 * - Fonctions SERVER → createAdminClient (bypass RLS)
 * - Fonctions CLIENT → createClient (respecte RLS)
 *
 * Note : Les notifications sont créées automatiquement par les triggers SQL.
 * Ce repository sert principalement à les LIRE et les MARQUER comme lues.
 */

import { createAdminClient } from "@/lib/supabase.server";
import { createClient } from "@/lib/client";
import type {
  Notification,
  NotificationInsert,
  NotificationWithOrder,
  NotificationType,
  RepositoryResponse,
  RepositoryListResponse,
} from "@/core/types";

// ============================================================
// TYPES LOCAUX
// ============================================================

interface GetNotificationsFilters {
  /** Si true, retourne uniquement les non lues */
  unreadOnly?: boolean;
  type?: NotificationType;
  /** Pagination — page commence à 1 */
  page?: number;
  /** Nombre d'éléments par page (défaut: 20) */
  perPage?: number;
}

// ============================================================
// REQUÊTES SERVEUR — Admin / Server Actions
// ============================================================

/**
 * Récupère toutes les notifications d'un utilisateur spécifique
 * Utilisé par l'admin pour voir les notifs de n'importe quel user
 * @example const { data } = await getNotificationsByUserId(userId)
 */
export async function getNotificationsByUserId(
  userId: string,
  filters: GetNotificationsFilters = {}
): Promise<RepositoryListResponse<NotificationWithOrder>> {
  if (!userId) {
    return { data: [], error: "userId manquant", count: 0 };
  }

  const { unreadOnly = false, type, page = 1, perPage = 20 } = filters;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createAdminClient();

  let query = supabase
    .from("notifications")
    .select(
      `
      *,
      order:orders!notifications_order_id_fkey (
        id, order_number, status
      )
    `,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (unreadOnly) query = query.eq("is_read", false);
  if (type) query = query.eq("type", type);

  const { data, error, count } = await query;

  if (error) {
    console.error("[NotificationRepository] getNotificationsByUserId:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return {
    data: (data as unknown as NotificationWithOrder[]) ?? [],
    error: null,
    count: count ?? 0,
  };
}

/**
 * Compte les notifications non lues d'un utilisateur
 * Utilisé pour afficher le badge rouge sur la cloche
 * @example const { data: count } = await getUnreadCount(userId)
 */
export async function getUnreadCount(
  userId: string
): Promise<RepositoryResponse<number>> {
  if (!userId) {
    return { data: null, error: "userId manquant" };
  }

  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true }) // head: true = pas de données, juste le count
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("[NotificationRepository] getUnreadCount:", error.message);
    return { data: null, error: error.message };
  }

  return { data: count ?? 0, error: null };
}

/**
 * Crée une notification manuellement — ADMIN SEULEMENT
 * Dans la plupart des cas les notifications sont créées par les triggers SQL.
 * Cette fonction sert pour les cas exceptionnels (message manuel de l'admin).
 * @example await createNotification({ user_id, type: 'new_order_available', title, message })
 */
export async function createNotification(
  payload: NotificationInsert
): Promise<RepositoryResponse<Notification>> {
  if (!payload.user_id) {
    return { data: null, error: "user_id manquant" };
  }
  if (!payload.title || !payload.message) {
    return { data: null, error: "title et message sont requis" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[NotificationRepository] createNotification:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Envoie une notification à tous les utilisateurs d'un rôle
 * Ex: notifier tous les livreurs d'une nouvelle commande urgente
 * @example await broadcastToRole('courier', { type, title, message })
 */
export async function broadcastToRole(
  role: "admin" | "courier" | "client",
  payload: Pick<NotificationInsert, "type" | "title" | "message" | "order_id">
): Promise<RepositoryResponse<number>> {
  const supabase = createAdminClient();

  // On récupère tous les profils actifs du rôle ciblé
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", role)
    .eq("is_active", true);

  if (profilesError || !profiles || profiles.length === 0) {
    return { data: 0, error: null }; // Pas d'erreur, juste personne à notifier
  }

  // On crée une notification pour chaque utilisateur
  const notifications: NotificationInsert[] = profiles.map((profile) => ({
    user_id: profile.id,
    type: payload.type,
    title: payload.title!,
    message: payload.message!,
    order_id: payload.order_id ?? null,
  }));

  const { error } = await supabase.from("notifications").insert(notifications);

  if (error) {
    console.error("[NotificationRepository] broadcastToRole:", error.message);
    return { data: null, error: error.message };
  }

  return { data: notifications.length, error: null };
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues — ADMIN
 * @example await markAllAsReadForUser(userId)
 */
export async function markAllAsReadForUser(
  userId: string
): Promise<RepositoryResponse<null>> {
  if (!userId) {
    return { data: null, error: "userId manquant" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("is_read", false); // Optimisation : on ne touche que les non lues

  if (error) {
    console.error("[NotificationRepository] markAllAsReadForUser:", error.message);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

// ============================================================
// REQUÊTES CLIENT — Utilisateur connecté (RLS actif)
// Chaque user ne peut voir QUE ses propres notifications (RLS)
// ============================================================

/**
 * Récupère les notifications de l'utilisateur connecté
 * @example const { data: notifs } = await getMyNotifications({ unreadOnly: true })
 */
export async function getMyNotifications(
  filters: GetNotificationsFilters = {}
): Promise<RepositoryListResponse<NotificationWithOrder>> {
  const { unreadOnly = false, type, page = 1, perPage = 20 } = filters;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = createClient();

  let query = supabase
    .from("notifications")
    .select(
      `
      *,
      order:orders!notifications_order_id_fkey (
        id, order_number, status
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (unreadOnly) query = query.eq("is_read", false);
  if (type) query = query.eq("type", type);

  const { data, error, count } = await query;

  if (error) {
    console.error("[NotificationRepository] getMyNotifications:", error.message);
    return { data: [], error: error.message, count: 0 };
  }

  return {
    data: (data as unknown as NotificationWithOrder[]) ?? [],
    error: null,
    count: count ?? 0,
  };
}

/**
 * Compte les notifications non lues de l'utilisateur connecté
 * Utilisé pour le badge sur la cloche de notifications
 * @example const { data: unreadCount } = await getMyUnreadCount()
 */
export async function getMyUnreadCount(): Promise<RepositoryResponse<number>> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("[NotificationRepository] getMyUnreadCount:", error.message);
    return { data: null, error: error.message };
  }

  return { data: count ?? 0, error: null };
}

/**
 * Marque une notification comme lue
 * @example await markAsRead(notificationId)
 */
export async function markAsRead(
  notificationId: string
): Promise<RepositoryResponse<Notification>> {
  if (!notificationId) {
    return { data: null, error: "notificationId manquant" };
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("is_read", false) // Optimisation : inutile de mettre à jour si déjà lue
    .select()
    .single();

  if (error) {
    // PGRST116 = déjà lue (aucune ligne modifiée) — pas vraiment une erreur
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    console.error("[NotificationRepository] markAsRead:", error.message);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Marque toutes les notifications de l'utilisateur connecté comme lues
 * @example await markAllAsRead()
 */
export async function markAllAsRead(): Promise<RepositoryResponse<null>> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("is_read", false); // RLS s'occupe du filtre par user_id automatiquement

  if (error) {
    console.error("[NotificationRepository] markAllAsRead:", error.message);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}

/**
 * Supprime toutes les notifications lues de l'utilisateur connecté
 * Pour nettoyer le centre de notifications
 * @example await deleteReadNotifications()
 */
export async function deleteReadNotifications(): Promise<
  RepositoryResponse<null>
> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("is_read", true); // RLS filtre automatiquement par user_id

  if (error) {
    console.error("[NotificationRepository] deleteReadNotifications:", error.message);
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
}
"use server";

/**
 * modules/notifications/actions/notifications.actions.ts
 * Server Actions uniquement — toutes les fonctions sont async.
 * Les helpers (buildStatusNotifications, etc.) sont dans notifications.helpers.ts
 */

import { revalidatePath }       from "next/cache";
import { createAdminClient }    from "@/lib/supabase.server";
import type { NotificationPayload } from "@/modules/notifications/lib/notifications.helpers";

/**
 * Insère une ou plusieurs notifications en base
 */
export async function createNotifications(
  notifications: NotificationPayload[]
): Promise<void> {
  if (notifications.length === 0) return;

  const supabase = createAdminClient();

  const rows = notifications.map((n) => ({
    user_id:  n.userId,
    order_id: n.orderId ?? null,
    type:     n.type,
    title:    n.title,
    message:  n.message,
    is_read:  false,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("[NotificationsAction] createNotifications:", error.message);
  }
}

/**
 * Marque une notification comme lue
 */
export async function markAsReadAction(notificationId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);
  revalidatePath("/dashboard");
}

/**
 * Marque toutes les notifications d'un user comme lues
 */
export async function markAllAsReadAction(userId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);
  revalidatePath("/dashboard");
}
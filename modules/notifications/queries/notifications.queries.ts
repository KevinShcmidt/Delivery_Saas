/**
 * modules/notifications/queries/notifications.queries.ts
 */

import { createAdminClient } from "@/lib/supabase.server";

export interface Notification {
  id:         string;
  user_id:    string;
  order_id:   string | null;
  type:       string;
  title:      string;
  message:    string;
  is_read:    boolean;
  read_at:    string | null;
  created_at: string;
}

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) { console.error("[NotificationsQuery]", error.message); return []; }
  return data ?? [];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}
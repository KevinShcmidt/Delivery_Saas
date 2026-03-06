/**
 * app/dashboard/layout.tsx
 * Charge les notifications côté serveur et les passe à AppShell
 */

import { redirect }        from "next/navigation";
import { createSsrClient } from "@/lib/supabase.ssr";
import AppShell            from "@/components/layout/AppShell";
import {
  getNotifications,
  getUnreadCount,
} from "@/modules/notifications/queries/notifications.queries";
import type { Profile } from "@/core/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSsrClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/login?error=profile_not_found");
  if (!profile.is_active)  redirect("/login?error=account_disabled");

  // Charge les notifications en parallèle
  const [initialNotifications, initialUnreadCount] = await Promise.all([
    getNotifications(user.id, 20),
    getUnreadCount(user.id),
  ]);

  return (
    <AppShell
      profile={profile as Profile}
      initialNotifications={initialNotifications}
      initialUnreadCount={initialUnreadCount}
      pendingOrdersCount={0}
      activeCouriersCount={0}
    >
      {children}
    </AppShell>
  );
}
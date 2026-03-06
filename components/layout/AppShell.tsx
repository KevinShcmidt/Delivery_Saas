"use client";

/**
 * components/layout/AppShell.tsx
 * Charge les notifications et les passe au Header
 */

import Header  from "./Header";
import Sidebar from "./Sidebar";
import { SidebarProvider, useSidebar } from "@/providers/SidebarProvider";
import type { Profile }      from "@/core/types";
import type { Notification } from "@/modules/notifications/queries/notifications.queries";

interface AppShellProps {
  profile:              Profile;
  children:             React.ReactNode;
  pendingOrdersCount?:  number;
  activeCouriersCount?: number;
  // Notifications chargées côté serveur (layout.tsx)
  initialNotifications: Notification[];
  initialUnreadCount:   number;
}

function AppShellInner({
  profile, children,
  pendingOrdersCount = 0, activeCouriersCount = 0,
  initialNotifications, initialUnreadCount,
}: AppShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar
        role={profile.role}
        pendingOrdersCount={pendingOrdersCount}
        activeCouriersCount={activeCouriersCount}
      />
      <div className={[
        "flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden transition-all duration-300",
        collapsed ? "ml-16" : "ml-60",
      ].join(" ")}>
        <Header
          profile={profile}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
        <main className="flex-1 p-7 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner {...props} />
    </SidebarProvider>
  );
}
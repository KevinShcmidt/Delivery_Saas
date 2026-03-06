"use client";

/**
 * components/layout/Sidebar.tsx
 * Utilise SidebarContext pour persister l'état collapsed entre navigations.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/providers/SidebarProvider";
import type { UserRole } from "@/core/types";

interface NavItem {
  label:  string;
  href:   string;
  icon:   React.ReactNode;
  badge?: number;
  roles?: UserRole[];
}

interface SidebarProps {
  role:                 UserRole;
  pendingOrdersCount?:  number;
  activeCouriersCount?: number;
}

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] shrink-0">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
);
const IconCouriers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] shrink-0">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconOrders = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] shrink-0">
    <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>
    <polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>
    <path d="m18 16 3 3-3 3"/><path d="M21 19h-5"/>
  </svg>
);
const IconMap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] shrink-0">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);
const IconAnalytics = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[18px] h-[18px] shrink-0">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export default function Sidebar({ role, pendingOrdersCount = 0, activeCouriersCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  const navItems: NavItem[] = [
    { label: "Tableau de bord", href: "/dashboard",    icon: <IconDashboard />, roles: ["admin", "courier"] },
    { label: "Livreurs",        href: "/couriers",     icon: <IconCouriers />,  badge: activeCouriersCount || undefined, roles: ["admin"] },
    { label: "Commandes",       href: "/orders",       icon: <IconOrders />,    badge: pendingOrdersCount  || undefined },
    { label: "Carte en direct", href: "/map",          icon: <IconMap />,       roles: ["admin", "courier"] },
    { label: "Statistiques",    href: "/analytics",    icon: <IconAnalytics />, roles: ["admin"] },
  ];

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className={[
      "fixed top-0 left-0 bottom-0 z-50 flex flex-col",
      "bg-gray-900 border-r border-white/10",
      "transition-all duration-300 overflow-hidden",
      collapsed ? "w-16" : "w-60",
    ].join(" ")}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[60px] border-b border-white/10 overflow-hidden shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-900 flex items-center justify-center shrink-0 text-sm font-bold text-white shadow-lg">
          FO
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-slate-100 whitespace-nowrap tracking-tight">
            Fleet<span className="text-indigo-400">Ops</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-2 pt-1 pb-2">
            Principal
          </p>
        )}

        {visibleItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={[
                "relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium",
                "whitespace-nowrap overflow-hidden transition-all duration-150 border",
                isActive
                  ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/25"
                  : "text-slate-400 border-transparent hover:bg-slate-800 hover:text-slate-100",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-sm bg-indigo-400" />
              )}
              {item.icon}
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-auto bg-indigo-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}

        {!collapsed && <div className="h-px bg-white/10 my-2" />}
      </nav>

      {/* Bouton réduire */}
      <div className="px-2 py-3 border-t border-white/10 shrink-0">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-white/10 text-slate-500 text-[13px] font-medium whitespace-nowrap overflow-hidden transition-all duration-150 hover:bg-slate-800 hover:text-slate-100 cursor-pointer bg-transparent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={["w-4 h-4 shrink-0 transition-transform duration-300", collapsed ? "rotate-180" : ""].join(" ")}>
            <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
          </svg>
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>
    </aside>
  );
}
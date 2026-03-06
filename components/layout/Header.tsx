"use client";

/**
 * components/layout/Header.tsx
 * Intègre NotificationBell à la place du lien /notifications
 */

import { useState, useRef, useEffect } from "react";
import Link                   from "next/link";
import type { Profile }       from "@/core/types";
import { USER_ROLE_LABELS }   from "@/core/types";
import { createClient }       from "@/lib/client";
import NotificationBell       from "@/modules/notifications/components/NotificationBell";
import type { Notification }  from "@/modules/notifications/queries/notifications.queries";

interface HeaderProps {
  profile:              Profile;
  initialNotifications: Notification[];
  initialUnreadCount:   number;
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function Header({
  profile,
  initialNotifications,
  initialUnreadCount,
}: HeaderProps) {
  const [showMenu, setShowMenu]     = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = getInitials(profile.full_name);

  return (
    <header className="h-[60px] bg-gray-900 border-b border-white/10 flex items-center gap-3 px-6 sticky top-0 z-40">

      {/* Recherche */}
      <div className="flex-1 max-w-sm relative">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[15px] h-[15px] absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Rechercher commandes, livreurs…"
          className="w-full bg-gray-800 border border-white/10 rounded-lg text-slate-100 text-[13px] pl-9 pr-3 py-1.5 outline-none placeholder:text-slate-500 focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="flex-1" />

      {/* Indicateur statut */}
      <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5 text-xs font-medium text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        Systèmes opérationnels
      </div>

      {/* 🔔 Notification Bell — remplace le Link /notifications */}
      <NotificationBell
        userId={profile.id}
        initialNotifications={initialNotifications}
        initialUnreadCount={initialUnreadCount}
      />

      {/* Paramètres */}
      <Link
        href="/profile"
        className="w-9 h-9 rounded-lg bg-gray-800 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-gray-700 hover:text-slate-100 transition-all"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93A10 10 0 0 1 21 12a10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 12 2"/>
        </svg>
      </Link>

      {/* Avatar + menu */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowMenu((p) => !p)}
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white hover:scale-105 transition-transform cursor-pointer border-0"
        >
          {initials}
        </button>

        {showMenu && (
          <div className="absolute top-[calc(100%+8px)] right-0 bg-gray-800 border border-white/15 rounded-xl p-1.5 min-w-[200px] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-2.5 py-2 pb-3 border-b border-white/10 mb-1.5">
              <p className="text-sm font-semibold text-slate-100">{profile.full_name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{profile.email}</p>
              <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 capitalize">
                {USER_ROLE_LABELS[profile.role]}
              </span>
            </div>

            <MenuLink href="/profile" onClick={() => setShowMenu(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Mon profil
            </MenuLink>

            <div className="h-px bg-white/10 my-1.5" />

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 text-left"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {signingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-400 text-sm font-medium hover:bg-gray-700 hover:text-slate-100 transition-all">
      {children}
    </Link>
  );
}
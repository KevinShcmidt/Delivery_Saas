/**
 * modules/notifications/components/NotificationBell.tsx
 * Cloche dans le header + dropdown + Supabase Realtime + Toast
 */

"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { createClient }       from "@/lib/client";
import { toast }              from "sonner";
import { markAsReadAction, markAllAsReadAction } from "@/modules/notifications/actions/notifications.actions";
import type { Notification }  from "@/modules/notifications/queries/notifications.queries";

interface NotificationBellProps {
  userId:               string;
  initialNotifications: Notification[];
  initialUnreadCount:   number;
}

// ── Icône cloche ──────────────────────────────────────────────────────────────
const IconBell = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className ?? "w-5 h-5"}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

// ── Formatage date relative ───────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `Il y a ${h}h`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ── Couleur par type ──────────────────────────────────────────────────────────
function typeColor(type: string): string {
  if (type === "order_delivered")      return "bg-emerald-500";
  if (type === "order_cancelled")      return "bg-red-500";
  if (type === "courier_assigned")     return "bg-blue-500";
  if (type === "order_created")        return "bg-indigo-500";
  if (type === "order_status_changed") return "bg-amber-500";
  return "bg-zinc-500";
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NotificationBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount]     = useState(initialUnreadCount);
  const [isOpen, setIsOpen]               = useState(false);
  const [isPending, startTransition]      = useTransition();
  const dropdownRef                       = useRef<HTMLDivElement>(null);

  // ── Ferme le dropdown en cliquant dehors ──────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Ajoute en tête de liste
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);

          // Toast immédiat
          toast(newNotif.title, {
            description: newNotif.message,
            duration:    5000,
            icon:        "🔔",
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── Marquer une notif comme lue ───────────────────────────────────────────
  function handleMarkRead(notifId: string) {
    setNotifications((prev) =>
      prev.map((n) => n.id === notifId ? { ...n, is_read: true } : n)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    startTransition(() => markAsReadAction(notifId));
  }

  // ── Tout marquer comme lu ─────────────────────────────────────────────────
  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    startTransition(() => markAllAsReadAction(userId));
  }

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bouton cloche */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all"
        aria-label="Notifications"
      >
        <IconBell />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* Header dropdown */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-400 rounded-full">
                  {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-600">
                <IconBell className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                  className={[
                    "flex gap-3 px-4 py-3 transition-colors",
                    !notif.is_read
                      ? "bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer"
                      : "opacity-60",
                  ].join(" ")}
                >
                  {/* Point coloré */}
                  <div className="flex-shrink-0 mt-1.5">
                    <span className={["w-2 h-2 rounded-full block", typeColor(notif.type)].join(" ")} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <p className={["text-sm leading-snug", notif.is_read ? "text-slate-400" : "text-slate-100 font-medium"].join(" ")}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(notif.created_at)}</p>
                  </div>

                  {/* Point non lu */}
                  {!notif.is_read && (
                    <div className="flex-shrink-0 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 block" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/10 text-center">
              <p className="text-xs text-zinc-600">
                {notifications.length} dernière{notifications.length > 1 ? "s" : ""} notification{notifications.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
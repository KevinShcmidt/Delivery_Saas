/**
 * components/ui/Badge.tsx
 * ─────────────────────────────────────────────
 * Badge de statut réutilisable.
 * Utilisé pour les statuts de commandes, livreurs, etc.
 *
 * @example
 * <Badge status="delivered" />
 * <Badge status="available" />
 * <Badge label="Custom" color="blue" />
 */

import type { OrderStatus, CourierStatus } from "@/core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant =
  | OrderStatus
  | CourierStatus
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

interface BadgeProps {
  /** Statut prédéfini — gère couleur + label automatiquement */
  status?: BadgeVariant;
  /** Label custom — si fourni, remplace le label automatique */
  label?: string;
  /** Taille du badge */
  size?: "sm" | "md";
  /** Afficher le point indicateur */
  dot?: boolean;
}

// ─── Config des statuts ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BadgeVariant, { label: string; className: string; dotColor: string }> = {
  // Statuts commandes
  pending:    { label: "En attente",  className: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",   dotColor: "bg-indigo-400" },
  assigned:   { label: "Assigné",     className: "bg-blue-500/10 text-blue-300 border-blue-500/20",         dotColor: "bg-blue-400" },
  in_transit: { label: "En transit",  className: "bg-amber-500/10 text-amber-300 border-amber-500/20",      dotColor: "bg-amber-400" },
  delivered:  { label: "Livré",       className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", dotColor: "bg-emerald-400" },
  failed:     { label: "Échoué",      className: "bg-red-500/10 text-red-300 border-red-500/20",            dotColor: "bg-red-400" },
  cancelled:  { label: "Annulé",      className: "bg-slate-500/10 text-slate-400 border-slate-500/20",      dotColor: "bg-slate-400" },

  // Statuts livreurs
  available:  { label: "Disponible",  className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", dotColor: "bg-emerald-400" },
  busy:       { label: "En livraison", className: "bg-amber-500/10 text-amber-300 border-amber-500/20",     dotColor: "bg-amber-400" },
  offline:    { label: "Hors ligne",  className: "bg-red-500/10 text-red-400 border-red-500/20",            dotColor: "bg-red-400" },

  // Variantes génériques
  success:    { label: "Succès",      className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", dotColor: "bg-emerald-400" },
  warning:    { label: "Attention",   className: "bg-amber-500/10 text-amber-300 border-amber-500/20",      dotColor: "bg-amber-400" },
  error:      { label: "Erreur",      className: "bg-red-500/10 text-red-300 border-red-500/20",            dotColor: "bg-red-400" },
  info:       { label: "Info",        className: "bg-blue-500/10 text-blue-300 border-blue-500/20",         dotColor: "bg-blue-400" },
  neutral:    { label: "Neutre",      className: "bg-slate-500/10 text-slate-400 border-slate-500/20",      dotColor: "bg-slate-400" },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Badge({
  status,
  label,
  size = "md",
  dot  = true,
}: BadgeProps) {
  // Si pas de status fourni, on utilise "neutral" par défaut
  const config = status ? STATUS_CONFIG[status] : STATUS_CONFIG.neutral;

  // Le label affiché : prop label > label automatique du status
  const displayLabel = label ?? config.label;

  const sizeClass = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-1"
    : "text-[11px] px-2 py-0.5 gap-1.5";

  const dotSize = size === "sm" ? "w-1 h-1" : "w-[5px] h-[5px]";

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-semibold whitespace-nowrap
        ${config.className}
        ${sizeClass}
      `}
    >
      {dot && (
        <span className={`rounded-full shrink-0 ${config.dotColor} ${dotSize}`} />
      )}
      {displayLabel}
    </span>
  );
}
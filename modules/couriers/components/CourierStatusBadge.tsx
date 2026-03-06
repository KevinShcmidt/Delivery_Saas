/**
 * modules/couriers/components/courier-status-badge/CourierStatusBadge.tsx
 */

import {
    COURIER_STATUS_LABELS,
    COURIER_STATUS_BADGE_COLORS,
  } from "@/core/entities/courier.entity";
  import type { CourierStatus } from "@/core/types";
  
  interface CourierStatusBadgeProps {
    status: CourierStatus;
    size?: "sm" | "md" | "lg";
    showDot?: boolean;
  }
  
  const SIZE_CLASSES = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  } as const;
  
  const DOT_SIZE_CLASSES = {
    sm: "w-1.5 h-1.5",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2",
  } as const;
  
  // Dark mode colors — correspondent au design system FleetOps
  const DARK_STATUS_COLORS: Record<CourierStatus, { bg: string; text: string; dot: string; border: string }> = {
    offline:   { bg: "bg-zinc-800/60",   text: "text-zinc-400",   dot: "bg-zinc-500",   border: "border-zinc-700/50"   },
    available: { bg: "bg-emerald-950/60", text: "text-emerald-400", dot: "bg-emerald-400", border: "border-emerald-800/50" },
    busy:      { bg: "bg-orange-950/60",  text: "text-orange-400",  dot: "bg-orange-400",  border: "border-orange-800/50"  },
  } as const;
  
  export function CourierStatusBadge({
    status,
    size = "md",
    showDot = true,
  }: CourierStatusBadgeProps) {
    const colors = DARK_STATUS_COLORS[status] ?? DARK_STATUS_COLORS.offline;
    const label  = COURIER_STATUS_LABELS[status] ?? status;
  
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full font-medium border",
          SIZE_CLASSES[size],
          colors.bg,
          colors.text,
          colors.border,
        ].join(" ")}
      >
        {showDot && (
          <span
            className={[
              "rounded-full flex-shrink-0",
              DOT_SIZE_CLASSES[size],
              colors.dot,
              status === "busy" ? "animate-pulse" : "",
            ].join(" ")}
            aria-hidden="true"
          />
        )}
        {label}
      </span>
    );
  }
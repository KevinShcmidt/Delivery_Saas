/**
 * components/ui/KpiCard.tsx
 * Carte metrique KPI pour le dashboard.
 */

type AccentColor = "indigo" | "emerald" | "amber" | "cyan" | "rose";

interface KpiCardProps {
  label:        string;
  value:        string | number;
  suffix?:      string;
  subtitle?:    string;
  icon?:        React.ReactNode;
  accentColor?: AccentColor;
  change?: { value: number; trend: "up" | "down"; upIsGood?: boolean };
  loading?:     boolean;
}

const ACCENT: Record<AccentColor, { bar: string; icon: string }> = {
  indigo:  { bar: "from-indigo-500 to-indigo-400",   icon: "bg-indigo-500/15 text-indigo-400" },
  emerald: { bar: "from-emerald-500 to-emerald-400", icon: "bg-emerald-500/15 text-emerald-400" },
  amber:   { bar: "from-amber-500 to-amber-400",     icon: "bg-amber-500/15 text-amber-400" },
  cyan:    { bar: "from-cyan-500 to-cyan-400",       icon: "bg-cyan-500/15 text-cyan-400" },
  rose:    { bar: "from-rose-500 to-rose-400",       icon: "bg-rose-500/15 text-rose-400" },
};

export default function KpiCard({
  label, value, suffix, subtitle, icon,
  accentColor = "indigo", change, loading = false,
}: KpiCardProps) {
  const accent = ACCENT[accentColor];
  const isPositive = change
    ? change.upIsGood === false ? change.trend === "down" : change.trend === "up"
    : null;

  if (loading) {
    return (
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 animate-pulse">
        <div className="h-3 w-24 bg-gray-800 rounded mb-4" />
        <div className="h-8 w-20 bg-gray-800 rounded mb-3" />
        <div className="h-3 w-32 bg-gray-800 rounded" />
      </div>
    );
  }

  return (
    <div className="relative bg-gray-900 border border-white/10 rounded-2xl p-5 overflow-hidden hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accent.bar} rounded-t-2xl`} />

      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.icon}`}>{icon}</div>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-bold text-slate-100 tracking-tight font-mono">
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </span>
        {suffix && <span className="text-lg font-medium text-slate-500">{suffix}</span>}
      </div>

      <div className="flex items-center justify-between gap-2">
        {change && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {change.trend === "up"
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="18 15 12 9 6 15"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="6 9 12 15 18 9"/></svg>
            }
            {change.value > 0 ? "+" : ""}{change.value}%
          </span>
        )}
        {subtitle && <span className="text-[11px] text-slate-600">{subtitle}</span>}
      </div>
    </div>
  );
}
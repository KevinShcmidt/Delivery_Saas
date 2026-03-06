/**
 * modules/dashboard/components/CourierStatusChart.tsx
 * Donut chart "Statut des livreurs" avec total au centre
 */

"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_CONFIG = [
  { key: "available", label: "Disponible",  color: "#10b981" },
  { key: "busy",      label: "En livraison", color: "#f59e0b" },
  { key: "offline",   label: "Hors ligne",   color: "#ef4444" },
] as const;

export interface CourierStatusData {
  available: number;
  busy:      number;
  offline:   number;
}

interface CourierStatusChartProps {
  data: CourierStatusData;
}

function CenterLabel({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-6" fontSize="28" fontWeight="bold" fill="#f4f4f5">
        {total}
      </tspan>
      <tspan x="50%" dy="22" fontSize="11" fill="#71717a">
        livreurs
      </tspan>
    </text>
  );
}

export default function CourierStatusChart({ data }: CourierStatusChartProps) {
  const total = data.available + data.busy + data.offline;

  const chartData = STATUS_CONFIG
    .map((s) => ({ ...s, value: data[s.key] }))
    .filter((s) => s.value > 0);

  // Si aucun livreur — affiche un anneau gris
  const displayData = chartData.length > 0
    ? chartData
    : [{ key: "empty", label: "Aucun", color: "#27272a", value: 1 }];

  return (
    <div className="bg-[#12141f] border border-white/5 rounded-2xl p-6 w-full lg:w-72 flex-shrink-0">
      <div className="mb-5">
        <h2 className="text-base font-bold text-slate-100">Statut des livreurs</h2>
        <p className="text-xs text-slate-500 mt-0.5">Disponibilité en temps réel</p>
      </div>

      {/* Donut */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={displayData}
              cx="50%" cy="50%"
              innerRadius={62} outerRadius={85}
              dataKey="value"
              paddingAngle={displayData.length > 1 ? 3 : 0}
              startAngle={90} endAngle={-270}
            >
              {displayData.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[#1a1d2e] border border-white/10 rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-200 font-semibold">{d.label}</span>
                    <span className="text-slate-400 ml-2">{d.value} livreur{d.value > 1 ? "s" : ""}</span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total au centre — superposé */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-100 leading-none">{total}</p>
            <p className="text-xs text-zinc-500 mt-1">livreurs</p>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="mt-4 space-y-2.5">
        {STATUS_CONFIG.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-sm text-slate-400">{s.label}</span>
            </div>
            <span className={[
              "text-sm font-bold tabular-nums",
              s.key === "available" ? "text-emerald-400" :
              s.key === "busy"      ? "text-amber-400"   : "text-red-400",
            ].join(" ")}>
              {data[s.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
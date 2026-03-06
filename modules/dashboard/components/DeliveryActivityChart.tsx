/**
 * modules/dashboard/components/DeliveryActivityChart.tsx
 * Line chart "Activité des livraisons" avec sélecteur Jour/Semaine/Mois
 */

"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const PERIODS = [
  { label: "Jour",    value: "day"   },
  { label: "Semaine", value: "week"  },
  { label: "Mois",    value: "month" },
] as const;

type Period = typeof PERIODS[number]["value"];

export interface DailyDelivery {
  date:      string;
  delivered: number;
  total:     number;
}

interface DeliveryActivityChartProps {
  dailyData:   DailyDelivery[];
  weeklyData:  DailyDelivery[];
  monthlyData: DailyDelivery[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1d2e] border border-white/10 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name} :</span>
          <span className="text-slate-100 font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DeliveryActivityChart({
  dailyData, weeklyData, monthlyData,
}: DeliveryActivityChartProps) {
  const [period, setPeriod] = useState<Period>("week");

  const data = period === "day" ? dailyData : period === "week" ? weeklyData : monthlyData;

  return (
    <div className="bg-[#12141f] border border-white/5 rounded-2xl p-6 flex-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-100">Activité des livraisons</h2>
          <p className="text-xs text-slate-500 mt-0.5">Livraisons effectuées cette {period === "day" ? "journée" : period === "week" ? "semaine" : "période"}</p>
        </div>
        {/* Sélecteur période */}
        <div className="flex items-center bg-[#1e2135] rounded-xl p-1 gap-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={[
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                period === p.value
                  ? "bg-[#2e3354] text-white shadow"
                  : "text-slate-500 hover:text-slate-300",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2135" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false} axisLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 11 }}
            tickLine={false} axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone" dataKey="delivered"
            name="Réel"
            stroke="#6366f1" strokeWidth={2.5}
            fill="url(#gradReal)"
            dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#6366f1" }}
          />
          <Area
            type="monotone" dataKey="total"
            name="Objectif"
            stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 5"
            fill="url(#gradTotal)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Légende */}
      <div className="flex gap-5 mt-4 px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-5 border-t-2 border-indigo-500 inline-block" />
          Réel
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-5 border-t-2 border-dashed border-emerald-500 inline-block" />
          Objectif
        </div>
      </div>
    </div>
  );
}
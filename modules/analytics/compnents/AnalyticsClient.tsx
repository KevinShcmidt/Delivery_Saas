/**
 * modules/analytics/components/AnalyticsClient.tsx
 * Orchestrateur client — gère le sélecteur de période + graphiques
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Trophy,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
  Star
} from "lucide-react";
import { AnalyticsData } from "../analytics.queries";
import { VehicleLabel } from "@/components/shared/VehicleLabel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " Ar";
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

// ─── Tooltip custom ───────────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400">{p.name} :</span>
          <span className="text-zinc-100 font-semibold">
            {p.name === "Revenus" ? formatAmount(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface AnalyticsClientProps {
  data:       AnalyticsData;
  periodDays: number;
}

const PERIODS = [
  { label: "7 jours",  value: 7  },
  { label: "14 jours", value: 14 },
  { label: "30 jours", value: 30 },
];

export default function AnalyticsClient({ data, periodDays }: AnalyticsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activePeriod, setActivePeriod] = useState(periodDays);

  function handlePeriodChange(days: number) {
    setActivePeriod(days);
    startTransition(() => {
      router.push(`/analytics?period=${days}`);
    });
  }

  const chartData = data.dailyStats.map((d) => ({
    date:      formatDate(d.date),
    Commandes: d.orders,
    Livrées:   d.delivered,
    Annulées:  d.cancelled,
    Revenus:   d.revenue,
  }));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Statistiques</h1>
          <div className="flex items-center gap-2 text-zinc-500 text-sm mt-0.5">
            <Calendar size={14} />
            <span>Du {formatDate(data.periodStart)} au {formatDate(data.periodEnd)}</span>
          </div>
        </div>

        {/* Sélecteur période */}
        <div className="flex items-center gap-1 bg-gray-900 border border-white/10 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              disabled={isPending}
              className={[
                "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                activePeriod === p.value
                  ? "bg-indigo-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
          {isPending && (
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin ml-1" />
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Commandes"
          value={data.totalOrders}
          sub={`${data.deliveredOrders} livrées`}
          icon={<TrendingUp size={18} />}
          accent="border-t-indigo-500"
          valueColor="text-indigo-400"
        />
        <KpiCard
          label="Revenus"
          value={formatAmount(data.totalRevenue)}
          sub={`Moy. ${formatAmount(data.avgOrderValue)}`}
          icon={<DollarSign size={18} />}
          accent="border-t-emerald-500"
          valueColor="text-emerald-400"
        />
        <KpiCard
          label="Taux de livraison"
          value={data.deliveryRate + "%"}
          sub={`${data.cancelledOrders} annulées`}
          icon={<CheckCircle2 size={18} />}
          accent="border-t-amber-500"
          valueColor="text-amber-400"
        />
        <KpiCard
          label="Délai moyen"
          value={data.avgDeliveryMin > 0 ? data.avgDeliveryMin + " min" : "—"}
          sub="pickup → livraison"
          icon={<Clock size={18} />}
          accent="border-t-blue-500"
          valueColor="text-blue-400"
        />
      </div>

      {/* Graphiques ligne 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Volume de commandes" subtitle="Évolution sur la période" icon={<BarChart3 size={16} />}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} />
              <Line type="monotone" dataKey="Commandes" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Livrées"   stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Annulées"  stroke="#71717a" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 px-1">
            <LegendItem color="#6366f1" label="Total" />
            <LegendItem color="#10b981" label="Livrées" />
            <LegendItem color="#71717a" label="Annulées" dashed />
          </div>
        </ChartCard>

        <ChartCard title="Revenus journaliers" subtitle="Commandes livrées uniquement" icon={<DollarSign size={16} />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={activePeriod <= 7 ? 20 : 10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Graphiques ligne 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Répartition des statuts" subtitle="Toutes les commandes" icon={<PieChartIcon size={16} />}>
          {data.statusBreakdown.length === 0 ? (
            <EmptyState message="Aucune donnée" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="count"
                    paddingAngle={3}
                  >
                    {data.statusBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs">
                          <span className="font-semibold text-zinc-100">{d.label}</span>
                          <span className="text-zinc-400 ml-2">{d.count} commandes</span>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {data.statusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-zinc-400 w-20">{s.label}</span>
                    <span className="text-zinc-200 font-semibold tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Livrées vs Annulées" subtitle="Comparaison journalière" icon={<BarChart3 size={16} />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={activePeriod <= 7 ? 14 : 7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="Livrées"  fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Annulées" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Classement livreurs */}
      <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="h-0.5 bg-indigo-500" />
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
          <Trophy className="text-amber-500" size={18} />
          <div>
            <h2 className="text-sm font-bold text-zinc-100">Classement des livreurs</h2>
            <p className="text-xs text-zinc-500">Performance sur la période</p>
          </div>
        </div>

        {data.courierRanking.length === 0 ? (
          <EmptyState message="Aucun livreur enregistré" />
        ) : (
          <div className="divide-y divide-zinc-800">
            {data.courierRanking.map((courier, index) => (
              <div key={courier.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/40 transition-colors">
                
                {/* Rang */}
                <div className={[
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                  index === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                  index === 1 ? "bg-zinc-400/10 text-zinc-400 border border-zinc-600/30" :
                  index === 2 ? "bg-orange-900/20 text-orange-600 border border-orange-800/30" :
                  "bg-zinc-800 text-zinc-600 border border-zinc-700",
                ].join(" ")}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-sm font-bold text-indigo-400 flex-shrink-0">
                  {courier.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-100 truncate">{courier.full_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <VehicleLabel type={courier.vehicle_type} iconOnly iconSize={12} className="text-zinc-500" />
                    <span className="text-xs text-zinc-500">· {courier.total_deliveries} au total</span>
                  </div>
                </div>

                {/* Stats période */}
                <div className="flex items-center gap-6 text-right flex-shrink-0">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Période</p>
                    <p className="text-sm font-bold text-emerald-400 tabular-nums">
                      {courier.deliveriesInPeriod}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Revenus</p>
                    <p className="text-sm font-bold text-zinc-200 tabular-nums">
                      {formatAmount(courier.revenueInPeriod)}
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Note</p>
                    <div className="flex items-center justify-end gap-1 text-amber-400">
                       <Star size={12} fill="currentColor" />
                       <span className="text-sm font-bold tabular-nums">
                         {courier.rating != null ? courier.rating.toFixed(1) : "—"}
                       </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent, valueColor, icon }: {
  label: string; value: string | number; sub: string; accent: string; valueColor: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden relative">
      <div className={["h-0.5 w-full absolute top-0", accent].join(" ")} />
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <div className="text-zinc-700">{icon}</div>
        </div>
        <p className={["text-2xl font-bold tabular-nums", valueColor].join(" ")}>{value}</p>
        <p className="text-xs text-zinc-600 mt-1">{sub}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-zinc-100">{title}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-zinc-700">{icon}</div>
      </div>
      <div className="px-3 pb-4 pt-2">{children}</div>
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className={["w-5 border-t-2 inline-block", dashed ? "border-dashed" : ""].join(" ")}
        style={{ borderColor: color }} />
      {label}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-600 text-sm gap-2">
      <PieChartIcon size={24} className="text-zinc-800" />
      {message}
    </div>
  );
}
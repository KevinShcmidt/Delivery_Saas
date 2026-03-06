/**
 * modules/dashboard/components/RecentOrdersTable.tsx
 */
"use client";

import Link from "next/link";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import type { RecentOrder } from "@/modules/dashboard/queries/dashboard.queries";
import type { OrderStatus } from "@/core/types";

function formatRelativeDate(dateStr: string): string {
  const diff    = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);
  if (minutes < 1)  return "À l'instant";
  if (minutes < 60) return minutes + " min";
  if (hours < 24)   return hours + "h";
  return days + "j";
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " Ar";
}

interface RecentOrdersTableProps {
  orders:   RecentOrder[];
  loading?: boolean;
  count?:   number;
}

export default function RecentOrdersTable({ orders, loading = false, count }: RecentOrdersTableProps) {
  const columns = [
    {
      key:   "order_number",
      label: "Commande",
      render: (row: RecentOrder) => (
        <span className="font-mono text-indigo-400 text-sm font-medium">{row.order_number}</span>
      ),
    },
    {
      key:   "client_name",
      label: "Client",
      render: (row: RecentOrder) => (
        <span className="text-slate-200 font-medium">
          {row.client_name_manual || row.client?.full_name || "Client inconnu"}
        </span>
      ),
    },
    {
      key:   "courier_name",
      label: "Livreur",
      render: (row: RecentOrder) => (
        <span className={row.courier?.full_name ? "text-slate-300" : "text-slate-600 italic"}>
          {row.courier?.full_name ?? "Non assigné"}
        </span>
      ),
    },
    {
      key:   "delivery_address",
      label: "Destination",
      render: (row: RecentOrder) => (
        <span className="text-slate-400 text-sm truncate max-w-[160px] block">
          {row.delivery_address}
        </span>
      ),
    },
    {
      key:   "status",
      label: "Statut",
      render: (row: RecentOrder) => <Badge status={row.status as OrderStatus} />,
    },
    {
      key:   "total_amount",
      label: "Montant",
      align: "right" as const,
      render: (row: RecentOrder) => (
        <span className="text-slate-200 font-medium font-mono text-sm">
          {formatAmount(row.total_amount)}
        </span>
      ),
    },
    {
      key:   "created_at",
      label: "Date",
      align: "right" as const,
      render: (row: RecentOrder) => (
        <span className="text-slate-600 text-sm">{formatRelativeDate(row.created_at)}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 mt-8">
        <div>
          <h2 className="text-base font-bold text-slate-100">Commandes récentes</h2>
          <p className="text-xs text-slate-500 mt-0.5">{count ?? orders.length} dernière{(count ?? orders.length) > 1 ? "s" : ""} commande{(count ?? orders.length) > 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/orders"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Voir toutes les commandes
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage="Aucune commande pour le moment"
        skeletonRows={5}
      />
    </div>
  );
}
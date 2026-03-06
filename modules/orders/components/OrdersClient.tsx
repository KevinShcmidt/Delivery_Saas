"use client";

/**
 * modules/orders/components/OrdersClient.tsx
 * - Suppression overflow-x-hidden qui bloquait le scroll Kanban
 * - Le scroll horizontal est isolé sur le wrapper du KanbanBoard
 */

import { useState }     from "react";
import { useRouter }    from "next/navigation";
import KanbanBoard      from "@/modules/orders/components/KanbanBoard";
import OrderDetailModal from "@/modules/orders/components/OrderDetailModal";
import CreateOrderModal from "@/modules/orders/components/CreateOrderModal";
import PageHeader       from "@/components/ui/PageHeader";
import Button           from "@/components/ui/Button";
import type { KanbanData, Order, OrderCourier } from "@/modules/orders/queries/orders.queries";

const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-500">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </svg>
);

interface Client { id: string; full_name: string; }
interface OrdersClientProps {
  initialData:       KanbanData;
  availableCouriers: OrderCourier[];
  clients:           Client[];
  totalCount:        number;
}

function filterKanban(data: KanbanData, search: string): KanbanData {
  const q = search.toLowerCase().trim();
  if (!q) return data;
  const filterOrders = (orders: Order[] = []) =>
    orders.filter((o) =>
      o.order_number.toLowerCase().includes(q) ||
      o.delivery_address.toLowerCase().includes(q) ||
      (o.client?.full_name ?? "").toLowerCase().includes(q) ||
      (o.client_name_manual ?? "").toLowerCase().includes(q)
    );
  return {
    pending:    filterOrders(data.pending),
    assigned:   filterOrders(data.assigned),
    in_transit: filterOrders(data.in_transit),
    delivered:  filterOrders(data.delivered),
    failed:     filterOrders(data.failed),
    cancelled:  filterOrders(data.cancelled),
  };
}

export default function OrdersClient({
  initialData, availableCouriers, clients, totalCount,
}: OrdersClientProps) {
  const router = useRouter();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [showDetail, setShowDetail]       = useState(false);
  const [search, setSearch]               = useState("");

  const safeData = initialData || {
    pending: [], assigned: [], in_transit: [],
    delivered: [], failed: [], cancelled: [],
  };

  const displayData  = search.trim() ? filterKanban(safeData, search) : safeData;
  const totalVisible = Object.values(displayData).reduce((sum, col) => sum + col.length, 0);

  function handleOrderClick(order: Order) { setSelectedOrder(order); setShowDetail(true); }
  function handleDetailClose()            { setShowDetail(false); setSelectedOrder(null); }
  function handleDataChanged()            { router.refresh(); }

  return (
    <div className="flex flex-col">

      <PageHeader
        title="Commandes"
        subtitle={totalCount + " commande" + (totalCount !== 1 ? "s" : "") + " au total"}
        action={
          <Button variant="primary" size="md" icon={<IconPlus />} onClick={() => setShowCreate(true)}>
            Nouvelle commande
          </Button>
        }
      />

      {/* Barre de recherche */}
      <div className="relative mb-6 max-w-sm">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <IconSearch />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par numéro, adresse, client..."
          className="w-full bg-gray-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600">
            {totalVisible} résultat{totalVisible !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/*
       * Ce wrapper isole le scroll horizontal du Kanban.
       * -mx-7 + px-7 compense le padding de <main> dans AppShell
       * pour que la scrollbar touche les bords de l'écran.
       */}
      <div className="overflow-x-auto -mx-7 px-7 pb-4">
        <KanbanBoard
          initialData={displayData}
          onOrderClick={handleOrderClick}
        />
      </div>

      <OrderDetailModal
        key={selectedOrder?.id || "empty"}
        order={selectedOrder}
        availableCouriers={availableCouriers}
        isOpen={showDetail}
        onClose={handleDetailClose}
        onUpdated={handleDataChanged}
      />

      <CreateOrderModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleDataChanged}
        clients={clients}
      />
    </div>
  );
}
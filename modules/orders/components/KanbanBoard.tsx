"use client";

import type { KanbanData, Order, OrderStatus } from "@/modules/orders/queries/orders.queries";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { updateOrderStatusAction } from "../actions/order.actions";
import { toast } from "sonner";
import { useEffect, useState } from "react";

// ─── Config colonnes ──────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialData:  KanbanData;
  onOrderClick: (order: Order) => void;
}

const COLUMNS: { status: OrderStatus; label: string; color: string; border: string }[] = [
  { status: "pending",    label: "En attente",  color: "text-indigo-400",  border: "border-indigo-500/30"  },
  { status: "assigned",   label: "Assigné",     color: "text-blue-400",    border: "border-blue-500/30"    },
  { status: "in_transit", label: "En transit",  color: "text-amber-400",   border: "border-amber-500/30"   },
  { status: "delivered",  label: "Livré",       color: "text-emerald-400", border: "border-emerald-500/30" },
  { status: "failed",     label: "Échoué",      color: "text-red-400",     border: "border-red-500/30"     },
  { status: "cancelled",  label: "Annulé",      color: "text-slate-400",   border: "border-slate-500/30"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " " + currency;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function findStatusOfOrder(id: string, data: KanbanData): OrderStatus {
  return (Object.keys(data) as OrderStatus[]).find(
    (status) => data[status].some((order) => order.id === id)
  ) || "pending";
}

function moveOrderLocally(data: KanbanData, orderId: string, from: OrderStatus, to: OrderStatus): KanbanData {
  const newData    = { ...data };
  const orderIndex = newData[from].findIndex((o) => o.id === orderId);
  if (orderIndex === -1) return data;
  const [movedOrder] = newData[from].splice(orderIndex, 1);
  movedOrder.status  = to;
  newData[to]        = [...newData[to], movedOrder];
  return newData;
}

// ─── Carte commande (Draggable) ───────────────────────────────────────────────

function DraggableOrderCard({ order, onClick }: { order: Order; onClick: (o: Order) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex:    isDragging ? 50 : 1,
    opacity:   isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onPointerUp={(e) => {
        // Si l'utilisateur n'est pas en train de dragger (mouvement < 8px)
        if (!isDragging) {
          e.stopPropagation();
          onClick(order);
        }
      }}
      className={`bg-gray-900 border border-white/10 rounded-xl p-3.5 cursor-grab active:cursor-grabbing hover:border-white/20 transition-all duration-150 ${isDragging ? "shadow-2xl ring-2 ring-indigo-500/50" : ""}`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-xs font-bold text-indigo-400 uppercase">
          {order.order_number}
        </span>
        <span className="text-xs font-semibold text-slate-300">
          {formatAmount(order.total_amount, order.currency)}
        </span>
      </div>

      {/* Client : manuel ou profil lié */}
      <div className="flex items-center gap-1.5 mb-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-slate-600 shrink-0">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="text-xs text-slate-400 truncate font-medium">
          {order.client_name_manual || order.client?.full_name || "Client inconnu"}
        </span>
      </div>

      <div className="flex items-start gap-1.5 mb-2.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-slate-600 shrink-0 mt-0.5">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {order.delivery_address}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
        <span className="text-[10px] text-slate-600 font-medium">
          {order.courier ? order.courier.full_name : "Non assigné"}
        </span>
        <span className="text-[10px] text-slate-700">
          {formatDate(order.created_at)}
        </span>
      </div>
    </div>
  );
}

// ─── Colonne (Droppable) ──────────────────────────────────────────────────────

function KanbanColumn({ status, label, color, border, orders, onCardClick }: {
  status:      OrderStatus;
  label:       string;
  color:       string;
  border:      string;
  orders:      Order[];
  onCardClick: (o: Order) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    /*
     * w-[280px] flex-shrink-0 — largeur fixe, ne se compresse jamais.
     * Le scroll horizontal est géré par le parent (OrdersClient).
     * Avant : w-auto min-w-[300px] flex-1 → causait le débordement page.
     */
    <div
      ref={setNodeRef}
      className={`w-[280px] flex-shrink-0 flex flex-col p-2 rounded-xl transition-colors ${isOver ? "bg-white/5" : ""}`}
    >
      <div className={"flex items-center gap-2 mb-3 pb-3 border-b " + border}>
        <span className={"text-sm font-bold " + color}>{label}</span>
        <span className={"text-xs font-bold px-2 py-0.5 rounded-full bg-gray-800 " + color}>
          {orders.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 min-h-[500px]">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-40">
            <span className="text-xs text-slate-700 font-medium italic">Vide</span>
          </div>
        ) : (
          orders.map((order) => (
            <DraggableOrderCard key={order.id} order={order} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Board principal ──────────────────────────────────────────────────────────

export default function KanbanBoard({ initialData, onOrderClick }: KanbanBoardProps) {
  const [boardData, setBoardData] = useState<KanbanData>(initialData);

  // Important : si les props changent (ex: router.refresh()), on met à jour l'état
  useEffect(() => {
    setBoardData(initialData);
  }, [initialData]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Oblige à bouger de 8px pour considérer que c'est un drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const orderId = active.id as string;

    // Préserve ton fallback sortable original
    const oldStatus = active.data.current?.sortable?.containerId
      || findStatusOfOrder(orderId, boardData);

    const newStatus = over.id as OrderStatus;
    if (oldStatus === newStatus) return;

    // 🚀 Optimistic update — déplace la carte immédiatement dans l'UI
    const updatedData = moveOrderLocally(boardData, orderId, oldStatus, newStatus);
    setBoardData(updatedData);

    const result = await updateOrderStatusAction(orderId, newStatus);

    if (result.success) {
      toast.success(`Statut mis à jour : ${newStatus}`);
    } else {
      // Rollback — restaure l'état avant le drag
      setBoardData(boardData);
      toast.error("Erreur lors du déplacement");
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      {/*
       * inline-flex — le board prend exactement la largeur de ses colonnes.
       * Le scroll horizontal est géré par OrdersClient (overflow-x-auto).
       * Avant : flex overflow-x-auto → le board lui-même scrollait ET débordait.
       */}
      <div className="inline-flex gap-6 pb-10 items-start">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            border={col.border}
            orders={boardData[col.status] || []}
            onCardClick={onOrderClick}
          />
        ))}
      </div>
    </DndContext>
  );
}
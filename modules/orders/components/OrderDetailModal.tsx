"use client";

import { useState, useTransition, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type {
  Order,
  OrderCourier,
  OrderStatus,
} from "@/modules/orders/queries/orders.queries";
// On ajoute l'action de mise à jour des détails
import { assignCourierAction, updateOrderStatusAction, updateOrderDetailsAction } from "../actions/order.actions";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " " + currency;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Ligne info (Adaptée pour l'édition) ──────────────────────────────────────

function InfoRow({ label, value, isEditing, children }: { label: string; value?: React.ReactNode; isEditing?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-28">{label}</span>
      <div className="flex-1 sm:text-right">
        {isEditing ? children : <span className="text-sm text-slate-200">{value}</span>}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrderDetailModalProps {
  order:             Order | null;
  availableCouriers: OrderCourier[];
  isOpen:            boolean;
  onClose:           () => void;
  onUpdated:         () => void;
}

export default function OrderDetailModal({
  order,
  availableCouriers,
  isOpen,
  onClose,
  onUpdated,
}: OrderDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState("");
  const [error, setError] = useState<string | null>(null);

  // État local pour le formulaire d'édition
  const [formData, setFormData] = useState({
    client_name_manual: order?.client_name_manual || order?.client?.full_name || "",
    delivery_address: order?.delivery_address || "",
    total_amount: order?.total_amount || 0,
  });

 
  if (!order) return null;

  // Conditions pour les actions
  const canAssign  = order.status === "pending";
  const canTransit = order.status === "assigned";
  const canDeliver = order.status === "in_transit";
  const canCancel  = !["delivered", "cancelled", "failed"].includes(order.status);

  // Sauvegarder les modifications (Adresse, Montant, etc.)
  async function handleUpdateDetails() {
    setError(null);
    startTransition(async () => {
      const result = await updateOrderDetailsAction(order!.id, formData);
      if (result.success) {
        toast.success("Commande mise à jour");
        setIsEditing(false);
        onUpdated();
      } else {
        setError("Erreur lors de la mise à jour");
      }
    });
  }

  // Fonctions de changement de statut existantes
  function handleAssign() {
    if (!selectedCourier) { setError("Sélectionnez un livreur"); return; }
    startTransition(async () => {
      const result = await assignCourierAction(order!.id, selectedCourier);
      if (!result.success) { setError(result.error ?? "Erreur"); return; }
      onUpdated();
      onClose();
    });
  }

  function handleStatus(status: any) {
    startTransition(async () => {
      const result = await updateOrderStatusAction(order!.id, status);
      if (!result.success) { setError(result.error ?? "Erreur"); return; }
      onUpdated();
      onClose();
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order.order_number}
      subtitle="Gestion de la commande"
      size="lg"
    >
      <div className="space-y-6">

        {/* Header : Statut + Bouton Modifier */}
        <div className="flex items-center justify-between">
          <Badge status={order.status as OrderStatus} />
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg"
          >
            {isEditing ? "ANNULER" : "MODIFIER"}
          </button>
        </div>

        {/* Infos principales (Éditables) */}
        <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-5 space-y-1">
          <InfoRow label="Client" value={formData.client_name_manual} isEditing={isEditing}>
            <input 
              className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
              value={formData.client_name_manual}
              onChange={(e) => setFormData({...formData, client_name_manual: e.target.value})}
            />
          </InfoRow>

          <InfoRow label="Livreur" value={order.courier?.full_name ?? "Non assigné"} />

          <InfoRow label="Montant" value={formatAmount(formData.total_amount, order.currency)} isEditing={isEditing}>
            <input 
              type="number"
              className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-right outline-none focus:border-indigo-500"
              value={formData.total_amount}
              onChange={(e) => setFormData({...formData, total_amount: Number(e.target.value)})}
            />
          </InfoRow>

          <InfoRow label="Livraison" value={formData.delivery_address} isEditing={isEditing}>
            <textarea 
              className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-right outline-none focus:border-indigo-500 min-h-[60px]"
              value={formData.delivery_address}
              onChange={(e) => setFormData({...formData, delivery_address: e.target.value})}
            />
          </InfoRow>

          {isEditing && (
            <div className="pt-4 flex justify-end">
              <Button onClick={handleUpdateDetails} loading={isPending} size="sm">
                Enregistrer les modifications
              </Button>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-gray-800/20 rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Timeline</p>
          <InfoRow label="Créé le" value={formatDate(order.created_at)} />
          {order.assigned_at && <InfoRow label="Assigné le" value={formatDate(order.assigned_at)} />}
          {order.delivered_at && <InfoRow label="Livré le" value={formatDate(order.delivered_at)} />}
        </div>

        {/* Erreurs */}
        {error && <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}

        {/* Actions d'Assignation et Statut */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          {canAssign && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Assigner un livreur</p>
              <div className="flex gap-2">
                <select
                  value={selectedCourier}
                  onChange={(e) => setSelectedCourier(e.target.value)}
                  className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
                >
                  <option value="">Choisir un livreur...</option>
                  {availableCouriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                <Button onClick={handleAssign} loading={isPending} size="md">Assigner</Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {canTransit && <Button variant="secondary" size="sm" onClick={() => handleStatus("in_transit")}>En transit</Button>}
            {canDeliver && <Button variant="primary" size="sm" onClick={() => handleStatus("delivered")}>Livré</Button>}
            {canCancel && <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => handleStatus("cancelled")}>Annuler la commande</Button>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
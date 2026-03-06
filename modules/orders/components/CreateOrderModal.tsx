"use client";

/**
 * modules/orders/components/CreateOrderModal.tsx
 * Modal formulaire de création d'une nouvelle commande.
 */

import { useState, useTransition } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { createOrderAction } from "../actions/order.actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id:        string;
  full_name: string;
}

interface CreateOrderModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onCreated: () => void;
  clients:   Client[];
}

interface FormState {
    client_name:      string; // Nouveau
    client_phone:     string; // Nouveau
    pickup_address:   string;
    delivery_address: string;
    total_amount:     string;
    notes:            string;
  }

  const EMPTY_FORM: FormState = {
    client_name:      "",
    client_phone:     "",
    pickup_address:   "",
    delivery_address: "",
    total_amount:     "",
    notes:            "",
  };

// ─── Composant Field ──────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors";

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CreateOrderModal({
  isOpen,
  onClose,
  onCreated,
  clients,
}: CreateOrderModalProps) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm]   = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormState) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setError(null);
    };
  }

  function handleClose() {
    setForm(EMPTY_FORM);
    setError(null);
    onClose();
  }

  function handleSubmit() {
    // 1. Validation locale mise à jour
    if (!form.client_name?.trim()) { 
      setError("Nom du client requis"); 
      return; 
    }
    if (!form.pickup_address?.trim()) { 
      setError("Adresse de ramassage requise"); 
      return; 
    }
    if (!form.delivery_address?.trim()) { 
      setError("Adresse de livraison requise"); 
      return; 
    }
    if (!form.total_amount || Number(form.total_amount) <= 0) {
      setError("Le montant doit être supérieur à 0");
      return;
    }
  
    // 2. Préparation du FormData (on remplace client_id par les infos manuelles)
    const formData = new FormData();
    formData.set("client_name",      form.client_name.trim());
    formData.set("client_phone",     form.client_phone?.trim() || ""); // Optionnel
    formData.set("pickup_address",   form.pickup_address.trim());
    formData.set("delivery_address", form.delivery_address.trim());
    formData.set("total_amount",     form.total_amount.toString());
    formData.set("notes",            form.notes?.trim() || "");
  
    // 3. Exécution de l'action
    startTransition(async () => {
      setError(null); // On réinitialise l'erreur avant de lancer
      
      const result = await createOrderAction(formData);
      
      if (!result.success) {
        setError(result.error ?? "Erreur lors de la création");
        return;
      }
  
      // Succès
      onCreated();
      handleClose();
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nouvelle commande"
      subtitle="Remplissez les informations de livraison"
      size="md"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} loading={isPending}>
            Créer la commande
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* Erreur */}
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

       {/* Section Client - Saisie Manuelle */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Field label="Nom du Client" required>
    <input
      type="text"
      value={form.client_name}
      onChange={handleChange("client_name")}
      placeholder="Nom complet du client"
      className={inputClass}
      required
    />
  </Field>

  <Field label="Téléphone Client">
    <input
      type="tel"
      value={form.client_phone}
      onChange={handleChange("client_phone")}
      placeholder="034 XX XXX XX"
      className={inputClass}
    />
  </Field>
</div>

        {/* Adresse ramassage */}
        <Field label="Adresse de ramassage" required>
          <input
            type="text"
            value={form.pickup_address}
            onChange={handleChange("pickup_address")}
            placeholder="Ex: Analakely, Antananarivo"
            className={inputClass}
          />
        </Field>

        {/* Adresse livraison */}
        <Field label="Adresse de livraison" required>
          <input
            type="text"
            value={form.delivery_address}
            onChange={handleChange("delivery_address")}
            placeholder="Ex: Ivandry, Antananarivo"
            className={inputClass}
          />
        </Field>

        {/* Montant */}
        <Field label="Montant (Ar)" required>
          <input
            type="number"
            value={form.total_amount}
            onChange={handleChange("total_amount")}
            placeholder="Ex: 15000"
            min="0"
            className={inputClass}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes (optionnel)">
          <textarea
            value={form.notes}
            onChange={handleChange("notes")}
            placeholder="Instructions spéciales pour la livraison..."
            rows={3}
            className={inputClass + " resize-none"}
          />
        </Field>
      </div>
    </Modal>
  );
}
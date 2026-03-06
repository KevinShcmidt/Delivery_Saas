"use server";

/**
 * modules/orders/actions/order.actions.ts
 * + Notifications intégrées sur : createOrder, assignCourier, updateOrderStatus
 */

import { revalidatePath }          from "next/cache";
import { createAdminClient }       from "@/lib/supabase.server";
import { incrementDeliveryCount }  from "@/infrastructure/supabase/repositories/courier.repository";
import { createNotifications }        from "@/modules/notifications/actions/notifications.actions";
import {
  buildStatusNotifications,
  buildNewOrderNotifications,
} from "@/modules/notifications/lib/notifications.helpers";

interface ActionResult<T = null> {
  success: boolean;
  error?:  string;
  data?:   T;
}

// ── Helper : récupère tous les admin IDs ─────────────────────────────────────
// Utilisé pour savoir qui notifier
async function getAdminIds(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);
  return (data ?? []).map((p) => p.id);
}

// ─── Créer une commande ───────────────────────────────────────────────────────

export async function createOrderAction(
  formData: FormData
): Promise<ActionResult<{ id: string; order_number: string }>> {

  const client_name      = formData.get("client_name")?.toString().trim() ?? "";
  const client_phone     = formData.get("client_phone")?.toString().trim() ?? "";
  const pickup_address   = formData.get("pickup_address")?.toString().trim() ?? "";
  const delivery_address = formData.get("delivery_address")?.toString().trim() ?? "";
  const total_amount     = Number(formData.get("total_amount") ?? 0);
  const notes            = formData.get("notes")?.toString().trim() || null;

  if (!client_name)      return { success: false, error: "Nom du client requis" };
  if (!pickup_address)   return { success: false, error: "Adresse de ramassage requise" };
  if (!delivery_address) return { success: false, error: "Adresse de livraison requise" };
  if (total_amount <= 0) return { success: false, error: "Montant invalide" };

  const supabase     = createAdminClient();
  const order_number = "ORD-" + Math.random().toString(36).toUpperCase().substring(2, 8);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      order_number,
      client_name_manual:  client_name,
      client_phone_manual: client_phone,
      status:              "pending",
      pickup_address,
      delivery_address,
      total_amount,
      currency: "MGA",
      notes,
    } as any)
    .select("id, order_number")
    .single();

  if (error) {
    console.error("[OrderAction] createOrder:", error.message);
    return { success: false, error: "Erreur lors de la création de la commande" };
  }

  // ── Notifie tous les admins ───────────────────────────────────────────────
  const adminIds = await getAdminIds();
  if (adminIds.length > 0) {
    await createNotifications(
      buildNewOrderNotifications({
        orderNumber: data.order_number,
        orderId:     data.id,
        adminIds,
        clientName:  client_name,
      })
    );
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { success: true, data: { id: data.id, order_number: data.order_number } };
}

// ─── Assigner un livreur ──────────────────────────────────────────────────────

export async function assignCourierAction(
  orderId:   string,
  profileId: string    // profiles.id — orders.courier_id référence profiles.id (FK: fk_courier)
): Promise<ActionResult> {

  if (!orderId)   return { success: false, error: "Commande introuvable" };
  if (!profileId) return { success: false, error: "Livreur requis" };

  const supabase = createAdminClient();

  // ── 1. Récupère le numéro de commande pour la notification ───────────────
  const { data: orderData } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .single();

  // ── 2. Assigner le livreur à la commande ──────────────────────────────────
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      courier_id:  profileId,
      status:      "assigned",
      assigned_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (orderError) {
    console.error("[OrderAction] assignCourier:", orderError.message);
    return { success: false, error: "Erreur lors de l'assignation" };
  }

  // ── 3. Passer le livreur en 'busy' ────────────────────────────────────────
  const { error: courierError } = await supabase
    .from("couriers")
    .update({ status: "busy" })
    .eq("profile_id", profileId);

  if (courierError) {
    console.error("[OrderAction] assignCourier - update courier status:", courierError.message);
  }

  // ── 4. Notifie admins + livreur assigné ───────────────────────────────────
  if (orderData?.order_number) {
    const adminIds = await getAdminIds();
    await createNotifications(
      buildStatusNotifications({
        orderNumber: orderData.order_number,
        orderId,
        newStatus:   "assigned",
        adminIds,
        courierId:   profileId, // le livreur reçoit aussi une notif
      })
    );
  }

  revalidatePath("/orders");
  revalidatePath("/couriers");
  return { success: true };
}

// ─── Mettre à jour le statut ──────────────────────────────────────────────────

export async function updateOrderStatusAction(
  orderId:   string,
  newStatus: string
): Promise<ActionResult> {
  if (!orderId) return { success: false, error: "ID de commande manquant" };

  const supabase = createAdminClient();

  // ── 1. Récupère courier_id + order_number ────────────────────────────────
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("courier_id, order_number")
    .eq("id", orderId)
    .single();

  if (fetchError) {
    console.error("[OrderAction] updateStatus - fetch order:", fetchError.message);
    return { success: false, error: "Commande introuvable" };
  }

  // ── 2. Mettre à jour le statut ────────────────────────────────────────────
  const updateData: Record<string, string> = { status: newStatus };
  const now = new Date().toISOString();

  if (newStatus === "in_transit") updateData.picked_up_at  = now;
  if (newStatus === "delivered")  updateData.delivered_at  = now;
  if (newStatus === "cancelled")  updateData.cancelled_at  = now;

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (error) {
    console.error("[OrderAction] updateStatus:", error.message);
    return { success: false, error: "Erreur lors de la mise à jour du statut" };
  }

  // ── 3. Synchroniser le statut du livreur ─────────────────────────────────
  if (order?.courier_id) {
    if (newStatus === "delivered") {
      const { data: courier } = await supabase
        .from("couriers")
        .select("id")
        .eq("profile_id", order.courier_id)
        .single();
      if (courier?.id) await incrementDeliveryCount(courier.id);

    } else if (newStatus === "assigned" || newStatus === "in_transit") {
      await supabase
        .from("couriers")
        .update({ status: "busy" })
        .eq("profile_id", order.courier_id);

    } else if (newStatus === "cancelled" || newStatus === "failed" || newStatus === "pending") {
      await supabase
        .from("couriers")
        .update({ status: "available" })
        .eq("profile_id", order.courier_id);
    }
  }

  // ── 4. Notifie admins + livreur concerné ──────────────────────────────────
  // Non bloquant — on ne fail pas l'action si les notifs échouent
  if (order?.order_number) {
    const adminIds = await getAdminIds();
    createNotifications(
      buildStatusNotifications({
        orderNumber: order.order_number,
        orderId,
        newStatus,
        adminIds,
        courierId: order.courier_id ?? undefined,
      })
    ).catch((err) =>
      console.error("[OrderAction] notifications:", err.message)
    );
  }

  revalidatePath("/orders");
  revalidatePath("/couriers");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Mettre à jour les détails ────────────────────────────────────────────────

export async function updateOrderDetailsAction(
  orderId: string,
  updates: {
    delivery_address?:   string;
    total_amount?:       number;
    client_name_manual?: string;
    courier_id?:         string | null;
  }
): Promise<ActionResult> {
  const supabase = createAdminClient();

  const { delivery_address, total_amount, client_name_manual, courier_id } = updates;

  const { error } = await supabase
    .from("orders")
    .update({
      delivery_address,
      total_amount,
      client_name_manual,
      courier_id: courier_id ?? null,
    })
    .eq("id", orderId);

  if (error) {
    console.error("[OrderAction] updateDetails:", error.message);
    return { success: false, error: error.message };
  }

  revalidatePath("/orders");
  return { success: true };
}
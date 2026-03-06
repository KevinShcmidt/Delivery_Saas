/**
 * modules/notifications/lib/notifications.helpers.ts
 * Fonctions utilitaires pures — PAS de "use server"
 * Construisent les payloads de notifications sans toucher à la DB.
 */

export type NotificationType =
  | "order_created"
  | "order_status_changed"
  | "courier_assigned"
  | "order_delivered"
  | "order_cancelled";

export interface NotificationPayload {
  userId:   string;
  orderId?: string;
  type:     NotificationType;
  title:    string;
  message:  string;
}

const STATUS_LABELS: Record<string, string> = {
  pending:    "En attente",
  assigned:   "Assigné",
  in_transit: "En transit",
  delivered:  "Livré",
  failed:     "Échoué",
  cancelled:  "Annulé",
};

export function buildStatusNotifications(params: {
  orderNumber: string;
  orderId:     string;
  newStatus:   string;
  adminIds:    string[];
  courierId?:  string;
}): NotificationPayload[] {
  const { orderNumber, orderId, newStatus, adminIds, courierId } = params;
  const notifications: NotificationPayload[] = [];
  const label = STATUS_LABELS[newStatus] ?? newStatus;

  let type: NotificationType = "order_status_changed";
  let title   = `Commande ${orderNumber}`;
  let message = `Statut mis à jour : ${label}`;

  if (newStatus === "delivered") {
    type    = "order_delivered";
    title   = `✅ Commande livrée`;
    message = `La commande ${orderNumber} a été livrée avec succès.`;
  } else if (newStatus === "cancelled") {
    type    = "order_cancelled";
    title   = `❌ Commande annulée`;
    message = `La commande ${orderNumber} a été annulée.`;
  } else if (newStatus === "assigned") {
    type    = "courier_assigned";
    title   = `🏍️ Livreur assigné`;
    message = `Un livreur a été assigné à la commande ${orderNumber}.`;
  }

  // Admins
  adminIds.forEach((userId) => {
    notifications.push({ userId, orderId, type, title, message });
  });

  // Livreur concerné lors de l'assignation
  if (courierId && newStatus === "assigned") {
    notifications.push({
      userId:  courierId,
      orderId,
      type:    "courier_assigned",
      title:   `🏍️ Nouvelle commande assignée`,
      message: `La commande ${orderNumber} vous a été assignée.`,
    });
  }

  return notifications;
}

export function buildNewOrderNotifications(params: {
  orderNumber: string;
  orderId:     string;
  adminIds:    string[];
  clientName:  string;
}): NotificationPayload[] {
  const { orderNumber, orderId, adminIds, clientName } = params;
  return adminIds.map((userId) => ({
    userId,
    orderId,
    type:    "order_created" as NotificationType,
    title:   `📦 Nouvelle commande`,
    message: `Commande ${orderNumber} créée pour ${clientName}.`,
  }));
}
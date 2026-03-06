/**
 * modules/notifications/lib/notifications.helpers.ts
 * Fonctions utilitaires pures — PAS de "use server"
 */

// Valeurs exactes de l'enum notification_type en base
export type NotificationType =
  | "order_assigned"
  | "order_picked_up"
  | "order_in_transit"
  | "order_delivered"
  | "order_failed"
  | "order_cancelled"
  | "new_order_available";

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

// Mapping statut commande → enum notification_type DB
const TYPE_MAP: Record<string, NotificationType> = {
  assigned:   "order_assigned",
  in_transit: "order_in_transit",
  delivered:  "order_delivered",
  failed:     "order_failed",
  cancelled:  "order_cancelled",
  picked_up:  "order_picked_up",
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

  const type: NotificationType = TYPE_MAP[newStatus] ?? "new_order_available";

  // Titre et message selon le statut
  let title   = `Commande ${orderNumber}`;
  let message = `Statut mis à jour : ${label}`;

  if (newStatus === "delivered")  { title = "Commande livrée";    message = `La commande ${orderNumber} a été livrée avec succès.`; }
  if (newStatus === "cancelled")  { title = "Commande annulée";   message = `La commande ${orderNumber} a été annulée.`; }
  if (newStatus === "assigned")   { title = "Livreur assigné";    message = `Un livreur a été assigné à la commande ${orderNumber}.`; }
  if (newStatus === "in_transit") { title = "Commande en transit"; message = `La commande ${orderNumber} est en cours de livraison.`; }
  if (newStatus === "failed")     { title = "Livraison échouée";  message = `La livraison de la commande ${orderNumber} a échoué.`; }

  // Notifie tous les admins
  adminIds.forEach((userId) => {
    notifications.push({ userId, orderId, type, title, message });
  });

  // Notifie le livreur lors de l'assignation
  if (courierId && newStatus === "assigned") {
    notifications.push({
      userId:  courierId,
      orderId,
      type:    "order_assigned",
      title:   "Nouvelle commande assignée",
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
    type:    "new_order_available" as NotificationType,
    title:   "Nouvelle commande",
    message: `Commande ${orderNumber} créée pour ${clientName}.`,
  }));
}
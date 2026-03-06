/**
 * Layout pour le groupe de routes (auth)
 * Toutes les pages auth (login, forgot-password, etc.) partagent ce layout
 * 
 * Pas de navbar ni sidebar ici — UI épurée pour l'auth
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | DeliverySaaS",
    default: "Authentification | DeliverySaaS",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout minimal — la page login gère tout son propre design
  return <>{children}</>;
}
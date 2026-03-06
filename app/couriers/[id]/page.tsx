/**
 * app/couriers/[id]/page.tsx
 * Dark mode — style FleetOps
 */

import { notFound } from "next/navigation";
import { fetchCourierDetail } from "@/modules/couriers/queries/courier.queries";
import { getCourierDisplayName } from "@/core/entities/courier.entity";
import { CourierDetail } from "@/modules/couriers/components/CourierDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { courier } = await fetchCourierDetail(id);
  if (!courier) return { title: "Livreur introuvable | FleetOps" };
  return { title: `${getCourierDisplayName(courier)} | FleetOps` };
}

export default async function CourierDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { courier, error } = await fetchCourierDetail(id);

  if (!courier || error) notFound();

  return <CourierDetail courier={courier} />;
}
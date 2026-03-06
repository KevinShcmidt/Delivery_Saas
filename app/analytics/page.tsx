/**
 * app/statistiques/page.tsx
 * Server Component — fetch les données analytics selon la période
 */

import { getAnalyticsData } from "@/modules/analytics/analytics.queries";
import AnalyticsClient from "@/modules/analytics/compnents/AnalyticsClient";


export const dynamic  = "force-dynamic";
export const metadata = { title: "Statistiques | FleetOps" };

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function StatistiquesPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Période valide : 7, 14 ou 30 jours — défaut 7
  const rawPeriod = parseInt(params.period ?? "7", 10);
  const periodDays = [7, 14, 30].includes(rawPeriod) ? rawPeriod : 7;

  const data = await getAnalyticsData(periodDays);

  return <AnalyticsClient data={data} periodDays={periodDays} />;
}
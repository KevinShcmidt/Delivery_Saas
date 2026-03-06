/**
 * app/map/page.tsx
 * Page carte en direct — /map
 * Server Component — fetch les données, passe au Client Component
 */

import { LiveMapClient } from "@/modules/map/components/LiveMapClient";
import { getMapData } from "@/modules/map/queriees/map.queries";

export const dynamic  = "force-dynamic"; // Pas de cache — données temps réel
export const metadata = { title: "Carte en direct | FleetOps" };

export default async function MapPage() {
  const { couriers, activeCounts } = await getMapData();

  return (
    <div className="flex flex-col space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Carte en direct</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Positions GPS des livreurs — actualisées toutes les 30s
        </p>
      </div>

      {/* Carte */}
      <div>
        <LiveMapClient
          initialCouriers={couriers}
          activeCounts={activeCounts}
        />
      </div>
    </div>
  );
}
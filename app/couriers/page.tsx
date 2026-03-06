/**
 * app/couriers/page.tsx
 * Dark mode — style FleetOps
 */

import { Suspense } from "react";
import Link from "next/link";
import { fetchCouriersList, fetchCourierStats } from "@/modules/couriers/queries/courier.queries";
import type { CourierStatus, VehicleType } from "@/core/types";
import { CourierFiltersBar } from "@/modules/couriers/components/CourierFiltersBar";
import { CourierList } from "@/modules/couriers/components/CourierList";

export const dynamic  = "force-dynamic";
export const metadata = { title: "Livreurs | FleetOps" };

const VALID_STATUSES:  CourierStatus[] = ["available", "busy", "offline"];
const VALID_VEHICLES:  VehicleType[]   = ["bike", "motorcycle", "car", "truck"];

interface PageProps {
  searchParams: Promise<{ status?: string; vehicle?: string; page?: string }>;
}

export default async function CouriersPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const status      = VALID_STATUSES.includes(params.status as CourierStatus) ? (params.status as CourierStatus) : undefined;
  const vehicleType = VALID_VEHICLES.includes(params.vehicle as VehicleType)  ? (params.vehicle as VehicleType)  : undefined;
  const page        = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // On charge la liste filtrée ET les stats globales en parallèle
  // Les stats sont calculées depuis les commandes réelles — pas depuis couriers.status
  // qui peut se désynchroniser si une action échoue silencieusement
  const [{ couriers, totalCount, totalPages }, stats] = await Promise.all([
    fetchCouriersList({ status, vehicleType, page, perPage: 15 }),
    fetchCourierStats(),
  ]);

  const { available, busy, offline } = stats;

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Livreurs</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{totalCount} livreur{totalCount > 1 ? "s" : ""} enregistré{totalCount > 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/couriers/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Nouveau livreur
        </Link>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Disponibles" value={available} accent="border-t-emerald-500" valueColor="text-emerald-400" />
        <MiniStat label="En livraison" value={busy}      accent="border-t-orange-500" valueColor="text-orange-400" />
        <MiniStat label="Hors ligne"   value={offline}   accent="border-t-zinc-600"   valueColor="text-zinc-400"   />
      </div>

      {/* Filtres */}
      <div className="bg-gray-900 border border-white/10 rounded-xl px-5 py-4">
        <Suspense fallback={<div className="h-8 bg-zinc-800 animate-pulse rounded" />}>
          <CourierFiltersBar />
        </Suspense>
      </div>

      {/* Liste */}
      <CourierList
        couriers={couriers}
        totalCount={totalCount}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  );
}

function MiniStat({ label, value, accent, valueColor }: {
  label: string; value: number; accent: string; valueColor: string;
}) {
  return (
    <div className={["bg-gray-900 border border-white/10 rounded-xl overflow-hidden"].join(" ")}>
      <div className={["h-0.5", accent].join(" ")} />
      <div className="px-5 py-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
        <p className={["text-3xl font-bold tabular-nums", valueColor].join(" ")}>{value}</p>
      </div>
    </div>
  );
}
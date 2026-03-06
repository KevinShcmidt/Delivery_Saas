/**
 * modules/couriers/queries/courier.queries.ts
 * ─────────────────────────────────────────────
 * Fonctions de fetch côté SERVEUR pour le module couriers.
 * Appelées depuis les Server Components (page.tsx, layout.tsx).
 *
 * ✅ Server Components uniquement
 * ❌ Ne jamais importer dans un "use client"
 *
 * Ces fonctions font le pont entre :
 *   infrastructure/supabase/repositories/courier.repository.ts (accès DB)
 *   ↕
 *   modules/couriers/components/ (UI)
 */

import {
    getAllCouriers,
    getCourierById,
  } from "@/infrastructure/supabase/repositories/courier.repository";
  import { createAdminClient } from "@/lib/supabase.server";
  import type { CourierFilters, CourierWithProfile } from "@/core/types";
  
  // Type enrichi avec le nombre de commandes actives
  export type CourierWithActiveOrders = CourierWithProfile & {
    activeOrdersCount: number;
  };
  
  // ─── Types de résultat ────────────────────────────────────────────────────────
  
  export interface CouriersListResult {
    couriers: CourierWithActiveOrders[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    error: string | null;
  }
  
  export interface CourierDetailResult {
    courier: CourierWithProfile | null;
    error: string | null;
  }
  
  // ─── Queries ──────────────────────────────────────────────────────────────────
  
  /**
   * Récupère la liste paginée des livreurs avec leurs filtres.
   * Utilisé par la page /couriers (liste admin).
   *
   * @example
   *   const result = await fetchCouriersList({ status: 'available', page: 1 })
   */
  export async function fetchCouriersList(
    filters: CourierFilters = {}
  ): Promise<CouriersListResult> {
    const {
      status,
      vehicleType,
      page = 1,
      perPage = 10,
    } = filters;
  
    const { data, error, count } = await getAllCouriers({
      // On ne passe "status" que si c'est pas "all" (filtre actif)
      status: status === "all" || !status ? undefined : status,
      vehicleType: vehicleType === "all" || !vehicleType ? undefined : vehicleType,
      page,
      perPage,
    });
  
    if (error) {
      return {
        couriers: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        error,
      };
    }
  
    const totalPages = Math.ceil(count / perPage);
  
    // Récupère le nombre de commandes actives (assigned + in_transit) par livreur
    // On utilise profile_id car orders.courier_id → profiles.id
    const supabase = createAdminClient();
    const profileIds = data.map((c) => c.profile_id);
  
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("courier_id")
      .in("status", ["assigned", "in_transit"])
      .in("courier_id", profileIds);
  
    // Compte par profile_id
    const activeCountMap = new Map<string, number>();
    for (const order of activeOrders ?? []) {
      if (order.courier_id) {
        activeCountMap.set(order.courier_id, (activeCountMap.get(order.courier_id) ?? 0) + 1);
      }
    }
  
    const couriersWithActiveOrders: CourierWithActiveOrders[] = data.map((courier) => ({
      ...courier,
      activeOrdersCount: activeCountMap.get(courier.profile_id) ?? 0,
    }));
  
    return {
      couriers: couriersWithActiveOrders,
      totalCount: count,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      error: null,
    };
  }
  
  /**
   * Récupère le détail d'un livreur par son ID.
   * Utilisé par la page /couriers/[id].
   *
   * @example
   *   const result = await fetchCourierDetail(params.id)
   */
  export async function fetchCourierDetail(
    id: string
  ): Promise<CourierDetailResult> {
    // Validation defensive — évite un appel DB inutile
    if (!id || typeof id !== "string" || id.trim() === "") {
      return { courier: null, error: "ID de livreur invalide" };
    }
  
    const { data, error } = await getCourierById(id);
  
    if (error) {
      return { courier: null, error };
    }
  
    // data peut être null si le livreur n'existe pas (PGRST116)
    if (!data) {
      return { courier: null, error: null }; // Géré par la page (notFound())
    }
  
    return { courier: data, error: null };
  }
  
  // ─── Stats globales ───────────────────────────────────────────────────────────
  
  export interface CourierStats {
    available: number;  // livreurs sans commande active
    busy:      number;  // livreurs avec commande assigned/in_transit
    offline:   number;  // livreurs offline (couriers.status)
    total:     number;
  }
  
  /**
   * Calcule les KPIs livreurs depuis les commandes réelles.
   * Ne se base PAS sur couriers.status qui peut se désynchroniser.
   *
   * - busy      = livreurs ayant au moins 1 commande assigned/in_transit
   * - available = livreurs actifs sans commande active
   * - offline   = livreurs avec status = 'offline'
   */
  export async function fetchCourierStats(): Promise<CourierStats> {
    const supabase = createAdminClient();
  
    // Fetch tous les livreurs avec leur statut
    const { data: allCouriers } = await supabase
      .from("couriers")
      .select("id, profile_id, status")
      .order("created_at", { ascending: false });
  
    if (!allCouriers || allCouriers.length === 0) {
      return { available: 0, busy: 0, offline: 0, total: 0 };
    }
  
    // Fetch les profile_ids qui ont des commandes actives
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("courier_id")
      .in("status", ["assigned", "in_transit"])
      .not("courier_id", "is", null);
  
    const busyProfileIds = new Set(
      (activeOrders ?? []).map((o) => o.courier_id).filter(Boolean)
    );
  
    let available = 0;
    let busy      = 0;
    let offline   = 0;
  
    for (const courier of allCouriers) {
      if (courier.status === "offline") {
        offline++;
      } else if (busyProfileIds.has(courier.profile_id)) {
        busy++;
      } else {
        available++;
      }
    }
  
    return { available, busy, offline, total: allCouriers.length };
  }
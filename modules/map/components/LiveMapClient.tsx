/**
 * modules/map/components/LiveMapClient.tsx
 * Supabase Realtime + simulation avec routes OSRM exactes
 */

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/client";
import { fetchRoute, TANA_ROUTES } from "@/modules/map/lib/routing";
import { MapCourier } from "../queriees/map.queries";

const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

interface LiveMapClientProps {
  initialCouriers: MapCourier[];
  activeCounts:    { available: number; busy: number; offline: number };
}

// État d'une simulation active
interface ActiveSim {
  courierId:   string;
  courierName: string;
  routeLabel:  string;
  status:      "loading" | "running" | "done";
}

export function LiveMapClient({ initialCouriers, activeCounts }: LiveMapClientProps) {
  const [couriers, setCouriers]             = useState<MapCourier[]>(initialCouriers);
  const [counts, setCounts]                 = useState(activeCounts);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [activeSims, setActiveSims]         = useState<ActiveSim[]>([]);

  // Formulaire simulation
  const [selCourier,  setSelCourier]  = useState("");
  const [selRoute,    setSelRoute]    = useState("0");

  // ── Supabase Realtime ─────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel  = supabase
      .channel("couriers-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "couriers" }, (payload) => {
        const u = payload.new as any;
        setCouriers((prev) => {
          const next = prev.map((c) =>
            c.id === u.id
              ? { ...c, status: u.status, current_lat: u.current_lat ? Number(u.current_lat) : null, current_lng: u.current_lng ? Number(u.current_lng) : null, last_location_at: u.last_location_at }
              : c
          );
          setCounts({
            available: next.filter((c) => c.status === "available").length,
            busy:      next.filter((c) => c.status === "busy").length,
            offline:   next.filter((c) => c.status === "offline").length,
          });
          return next;
        });
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED")   setRealtimeStatus("connected");
        if (s === "CHANNEL_ERROR") setRealtimeStatus("error");
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Lance une simulation OSRM ─────────────────────────────────────────────
  const startSimulation = useCallback(async () => {
    if (!selCourier) return;

    const courier  = couriers.find((c) => c.id === selCourier);
    const routeDef = TANA_ROUTES[Number(selRoute)];
    if (!courier || !routeDef) return;

    // Marque comme "loading"
    const sim: ActiveSim = {
      courierId:   courier.id,
      courierName: courier.full_name,
      routeLabel:  routeDef.label,
      status:      "loading",
    };
    setActiveSims((prev) => [...prev.filter((s) => s.courierId !== courier.id), sim]);

    // Récupère la route exacte via OSRM
    const route = await fetchRoute(routeDef.from, routeDef.to);
    if (!route) {
      setActiveSims((prev) => prev.filter((s) => s.courierId !== courier.id));
      alert("Impossible de récupérer la route OSRM. Vérifie ta connexion.");
      return;
    }

    setActiveSims((prev) =>
      prev.map((s) => s.courierId === courier.id ? { ...s, status: "running" } : s)
    );

    // Callback appelé à chaque étape par LiveMap pour mettre à jour Supabase
    const supabase = createClient();
    const updatePosition = async (lat: number, lng: number) => {
      await supabase
        .from("couriers")
        .update({ current_lat: lat, current_lng: lng, last_location_at: new Date().toISOString() })
        .eq("id", courier.id);
    };

    // Dispatch l'event vers LiveMap (communication entre composants sans prop drilling)
    window.dispatchEvent(new CustomEvent("map:start-route", {
      detail: { courierId: courier.id, route: route.points, updatePosition },
    }));
  }, [selCourier, selRoute, couriers]);

  // ── Stop une simulation ───────────────────────────────────────────────────
  const stopSimulation = useCallback((courierId: string) => {
    window.dispatchEvent(new CustomEvent("map:stop-route", { detail: { courierId } }));
    setActiveSims((prev) => prev.filter((s) => s.courierId !== courierId));
  }, []);

  const couriersLocated = couriers.filter((c) => c.current_lat && c.current_lng);

  return (
    <div className="flex flex-col gap-4">

      {/* Stats + realtime badge */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatPill label="Disponibles" count={counts.available} color="text-emerald-400" dot="bg-emerald-400" />
          <StatPill label="En livraison" count={counts.busy}      color="text-amber-400"   dot="bg-amber-400 animate-pulse" />
          <StatPill label="Hors ligne"   count={counts.offline}   color="text-zinc-500"    dot="bg-zinc-600" />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg">
            <span className={[
              "w-1.5 h-1.5 rounded-full",
              realtimeStatus === "connected"  ? "bg-emerald-400 animate-pulse" : "",
              realtimeStatus === "connecting" ? "bg-amber-400 animate-pulse"   : "",
              realtimeStatus === "error"      ? "bg-red-400"                   : "",
            ].join(" ")} />
            <span className="text-zinc-400">
              {realtimeStatus === "connected"  && "Realtime actif"}
              {realtimeStatus === "connecting" && "Connexion..."}
              {realtimeStatus === "error"      && "Erreur WebSocket"}
            </span>
          </div>
          <span className="text-zinc-600">
            {couriersLocated.length} livreur{couriersLocated.length > 1 ? "s" : ""} localisé{couriersLocated.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Carte — hauteur fixe pour éviter le débordement sur petits écrans */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden relative" style={{ height: "480px" }}>
        <div className="h-0.5 w-full bg-indigo-500" />
        <div className="absolute inset-0 top-0.5">
          <LiveMap couriers={couriers} />
        </div>
        {/* Badge En direct */}
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700/50 rounded-full text-xs font-medium text-zinc-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          En direct
        </div>
        {/* Simulations actives — overlay */}
        {activeSims.length > 0 && (
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            {activeSims.map((sim) => (
              <div key={sim.courierId} className="flex items-center gap-2 px-3 py-2 bg-zinc-900/95 backdrop-blur-sm border border-amber-800/40 rounded-lg text-xs">
                {sim.status === "loading" && (
                  <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                )}
                {sim.status === "running" && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
                <div className="flex flex-col">
                  <span className="text-zinc-300 font-medium">{sim.courierName}</span>
                  <span className="text-zinc-500">{sim.routeLabel}</span>
                </div>
                <button
                  onClick={() => stopSimulation(sim.courierId)}
                  className="ml-1 text-zinc-600 hover:text-red-400 transition-colors font-bold"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panneau simulateur */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="h-0.5 w-full bg-amber-500" />
        <div className="p-5">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
            🛣️ Simulation de trajet réel (OSRM)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">

            {/* Sélection livreur */}
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Livreur</label>
              <select
                value={selCourier}
                onChange={(e) => setSelCourier(e.target.value)}
                className="w-full text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Choisir un livreur...</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection trajet */}
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Trajet</label>
              <select
                value={selRoute}
                onChange={(e) => setSelRoute(e.target.value)}
                className="w-full text-sm bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {TANA_ROUTES.map((r, i) => (
                  <option key={i} value={i}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Bouton lancer */}
            <button
              onClick={startSimulation}
              disabled={!selCourier || activeSims.some((s) => s.courierId === selCourier && s.status === "running")}
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {activeSims.some((s) => s.courierId === selCourier && s.status === "loading") ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Calcul de la route...
                </>
              ) : (
                "▶ Lancer la simulation"
              )}
            </button>
          </div>

          {/* Infos */}
          <p className="text-xs text-zinc-600 mt-4">
            La route exacte est calculée via <span className="text-zinc-400">OSRM</span> (Open Source Routing Machine).
            Le livreur suit les vraies rues — le tracé jaune montre le chemin parcouru en temps réel.
          </p>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-zinc-500">
        <LegendItem icon="🏍️" label="Moto" />
        <LegendItem icon="🚲" label="Vélo" />
        <LegendItem icon="🚗" label="Voiture" />
        <LegendItem icon="🚚" label="Camion" />
        <div className="w-px h-3 bg-zinc-700" />
        <LegendItem color="#10b981" label="Disponible" />
        <LegendItem color="#f59e0b" label="En livraison" />
        <LegendItem color="#52525b" label="Hors ligne" />
        <div className="w-px h-3 bg-zinc-700" />
        <div className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-yellow-400 inline-block" />
          <span>Trajet parcouru</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-zinc-600 inline-block" />
          <span>Route totale</span>
        </div>
        <LegendItem icon="📦" label="Destination" />
      </div>
    </div>
  );
}

function StatPill({ label, count, color, dot }: { label: string; count: number; color: string; dot: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
      <span className={["w-1.5 h-1.5 rounded-full flex-shrink-0", dot].join(" ")} />
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={["text-sm font-bold tabular-nums", color].join(" ")}>{count}</span>
    </div>
  );
}

function LegendItem({ icon, color, label }: { icon?: string; color?: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon  && <span>{icon}</span>}
      {color && <span className="w-2 h-2 rounded-full" style={{ background: color }} />}
      <span>{label}</span>
    </div>
  );
}
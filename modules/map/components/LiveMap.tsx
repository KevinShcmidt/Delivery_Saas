/**
 * modules/map/components/LiveMap.tsx
 * Carte Leaflet + routes OSRM exactes + tracé jaune progressif
 *
 * ⚠️  HACK DOCUMENTÉ — import dynamique obligatoire
 * Leaflet accède à `window` → crash SSR → dynamic({ ssr: false })
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RoutePoint }  from "@/modules/map/lib/routing";
import { MapCourier } from "../queriees/map.queries";
import { VehicleLabel } from "@/components/shared/VehicleLabel";
import { renderToStaticMarkup } from "react-dom/server";

const STATUS_COLORS: Record<string, string> = {
  available: "#10b981", busy: "#f59e0b", offline: "#52525b",
};
const STATUS_LABELS: Record<string, string> = {
  available: "Disponible", busy: "En livraison", offline: "Hors ligne",
};

// État interne par livreur
interface CourierMapState {
  marker:     any;           // marqueur Leaflet livreur
  destMarker: any | null;    // marqueur destination 📦
  routeLine:  any | null;    // polyligne route complète (gris)
  tracedLine: any | null;    // polyligne portion parcourue (jaune)
  route:      RoutePoint[];  // tous les points de la route
  routeIndex: number;        // index courant sur la route
  animFrame:  any | null;    // requestAnimationFrame handle
}

export interface SimulationRoute {
  courierId: string;
  route:     RoutePoint[];
}

interface LiveMapProps {
  couriers:        MapCourier[];
  simulationRoutes?: SimulationRoute[];  // routes à afficher/animer
  defaultCenter?:  [number, number];
  defaultZoom?:    number;
}

export default function LiveMap({
  couriers,
  simulationRoutes = [],
  defaultCenter = [-18.9137, 47.5361],
  defaultZoom   = 12,
}: LiveMapProps) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const LRef        = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const statesRef   = useRef<Map<string, CourierMapState>>(new Map());
  const isReady     = useRef(false);

  // ── Crée ou met à jour le marqueur d'un livreur ──────────────────────────
  const upsertMarker = useCallback((L: any, map: any, courier: MapCourier) => {
    if (!courier.current_lat || !courier.current_lng) return;

  const color = STATUS_COLORS[courier.status] ?? STATUS_COLORS.offline;
  
  // Utilisation de renderToStaticMarkup pour transformer le composant en string HTML
  const vehicleHtml = renderToStaticMarkup(
    <VehicleLabel iconOnly type={courier.vehicle_type as "bike" | "motorcycle" | "car" | "truck"} />
  );
    const latlng  = [courier.current_lat, courier.current_lng] as [number, number];
    const state   = statesRef.current.get(courier.id);

    if (state?.marker) {
      // Déplace le marqueur existant
      state.marker.setLatLng(latlng);
      state.marker.setIcon(buildCourierIcon(L, color, vehicleHtml)); 
      state.marker.setPopupContent(buildCourierPopup(courier, color));

      // Met à jour le tracé jaune parcouru jusqu'à la position actuelle
      if (state.route.length > 0 && state.tracedLine) {
        const traced = state.route
          .slice(0, state.routeIndex + 1)
          .map((p) => [p.lat, p.lng]);
        if (traced.length > 1) {
          state.tracedLine.setLatLngs(traced);
        }
      }
    } else {
      // Nouveau marqueur
      const marker = L.marker(latlng, { 
        icon: buildCourierIcon(L, color, vehicleHtml) 
      });
      marker.bindPopup(buildCourierPopup(courier, color), {
        className: "leaflet-popup-dark", maxWidth: 280,
      });
      marker.addTo(map);

      let destMarker = null;
      if (courier.active_order?.delivery_lat && courier.active_order?.delivery_lng) {
        destMarker = buildDestMarker(L, courier.active_order);
        destMarker.addTo(map);
      }

      statesRef.current.set(courier.id, {
        marker, destMarker,
        routeLine: null, tracedLine: null,
        route: [], routeIndex: 0, animFrame: null,
      });
    }
  }, []);

  // ── Affiche une route et anime le livreur point par point ────────────────
  const applyRoute = useCallback((
    L: any, map: any,
    courierId: string,
    route: RoutePoint[],
    updatePosition: (lat: number, lng: number) => void
  ) => {
    if (route.length < 2) return;

    const state = statesRef.current.get(courierId);
    if (!state) return;

    // Supprime l'ancienne route
    state.routeLine?.remove();
    state.tracedLine?.remove();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);

    const allLatLngs = route.map((p) => [p.lat, p.lng]);

    // Route complète en gris transparent (chemin total)
    const routeLine = L.polyline(allLatLngs, {
      color: "#52525b", weight: 3, opacity: 0.35, dashArray: "4 4",
    }).addTo(map);

    // Tracé parcouru en jaune vif (portion déjà faite)
    const tracedLine = L.polyline([[route[0].lat, route[0].lng]], {
      color: "#fbbf24", weight: 4, opacity: 0.9,
    }).addTo(map);

    state.route      = route;
    state.routeIndex = 0;
    state.routeLine  = routeLine;
    state.tracedLine = tracedLine;

    // Zoom sur la route
    map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });

    // Animation progressive — avance d'un point toutes les ~2s
    let index = 0;
    const STEP_MS = 2000;
    let lastTime  = performance.now();

    function step(now: number) {
      // 1. On récupère la valeur actuelle depuis le Ref
      const currentState = statesRef.current.get(courierId);
    
      // 2. Type Guard : Si state est undefined, on arrête tout proprement
      if (!currentState) return;
    
      if (now - lastTime < STEP_MS) {
        currentState.animFrame = requestAnimationFrame(step);
        return;
      }
      
      lastTime = now;
    
      if (index >= route.length - 1) {
        index = 0;
        tracedLine.setLatLngs([[route[0].lat, route[0].lng]]);
      } else {
        index++;
      }
    
      // Ici, TypeScript sait que 'currentState' est de type 'CourierMapState' (pas undefined)
      currentState.routeIndex = index;
      const { lat, lng } = route[index];
    
      // Déplace le marqueur Leaflet
      currentState.marker?.setLatLng([lat, lng]);
    
      // Met à jour le tracé jaune
      const traced = route.slice(0, index + 1).map((p) => [p.lat, p.lng]);
      if (traced.length > 1) tracedLine.setLatLngs(traced);
    
      // Envoie la position à la simulation
      updatePosition(lat, lng);
    
      currentState.animFrame = requestAnimationFrame(step);
    }

    state.animFrame = requestAnimationFrame(step);
  }, []);

  // Exposé pour que LiveMapClient puisse déclencher une route
  useEffect(() => {
    if (!isReady.current || !LRef.current || !mapInstance.current) return;
    if (simulationRoutes.length === 0) return;

    simulationRoutes.forEach(({ courierId, route }) => {
      // updatePosition sera passé via callback — on utilise un event custom
      const handler = (e: any) => {
        applyRoute(LRef.current, mapInstance.current, courierId, route, e.detail.update);
      };
      window.addEventListener(`start-route-${courierId}`, handler, { once: true });
    });
  }, [simulationRoutes, applyRoute]);

  // API publique — déclenche une route depuis LiveMapClient
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (!isReady.current || !LRef.current || !mapInstance.current) return;
      const { courierId, route, updatePosition } = e.detail;
      applyRoute(LRef.current, mapInstance.current, courierId, route, updatePosition);
    };
    window.addEventListener("map:start-route", handler as EventListener);
    return () => window.removeEventListener("map:start-route", handler as EventListener);
  }, [applyRoute]);

  // API publique — stop/reset une route
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { courierId } = e.detail;
      const state = statesRef.current.get(courierId);
      if (!state) return;
      if (state.animFrame) cancelAnimationFrame(state.animFrame);
      state.routeLine?.remove();
      state.tracedLine?.remove();
      state.route      = [];
      state.routeIndex = 0;
      state.routeLine  = null;
      state.tracedLine = null;
    };
    window.addEventListener("map:stop-route", handler as EventListener);
    return () => window.removeEventListener("map:stop-route", handler as EventListener);
  }, []);

  // ── Init carte ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // ⚠️  HACK — React StrictMode monte/démonte deux fois en dev
    // Leaflet stocke un flag "_leaflet_id" sur le DOM node.
    // On le nettoie avant d'initialiser pour éviter "already initialized".
    const container = mapRef.current as any;
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    // Si une instance existe déjà (re-render), on la détruit proprement
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
      statesRef.current.clear();
      isReady.current = false;
    }

    import("leaflet").then((L) => {
      // Double vérif — le composant peut être démonté pendant l'import async
      if (!mapRef.current) return;

      LRef.current = L;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      mapInstance.current = L.map(mapRef.current!, {
        center: defaultCenter, zoom: defaultZoom,
        zoomControl: false, attributionControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(mapInstance.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapInstance.current);
      L.control.attribution({ position: "bottomleft", prefix: false })
        .addAttribution('© <a href="https://carto.com">CARTO</a> © <a href="https://openstreetmap.org">OSM</a>')
        .addTo(mapInstance.current);

      isReady.current = true;
      couriers.forEach((c) => upsertMarker(L, mapInstance.current, c));
    });

    return () => {
      // Annule toutes les animations en cours
      statesRef.current.forEach((state) => {
        if (state.animFrame) cancelAnimationFrame(state.animFrame);
      });
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        statesRef.current.clear();
        isReady.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marqueurs quand couriers change
  useEffect(() => {
    if (!isReady.current || !LRef.current || !mapInstance.current) return;
    couriers.forEach((c) => upsertMarker(LRef.current, mapInstance.current, c));
  }, [couriers, upsertMarker]);

  return (
    <>
      <style>{LEAFLET_DARK_CSS}</style>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCourierIcon(L: any, color: string, vehicleHtml: string) {
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color}22;
        border: 2px solid ${color};
        border-radius: 50%;
        display: flex;            /* Active le flex */
        align-items: center;      /* Centre verticalement */
        justify-content: center;   /* Centre horizontalement */
        box-shadow: 0 0 12px ${color}66;
        overflow: hidden;         /* Évite que le SVG dépasse */
      ">
        ${vehicleHtml}
      </div>`,
  });
}

function buildCourierPopup(courier: MapCourier, color: string): string {
  const lastSeen = courier.last_location_at
    ? new Date(courier.last_location_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "Inconnu";
  const orderInfo = courier.active_order ? `
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid #3f3f46;">
      <div style="color:#94a3b8;font-size:10px;text-transform:uppercase;">Commande en cours</div>
      <div style="color:#e4e4e7;font-weight:600;margin-top:2px;">${courier.active_order.order_number}</div>
      <div style="color:#71717a;font-size:11px;margin-top:2px;">${courier.active_order.delivery_address}</div>
    </div>` : "";
  return `<div style="background:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:14px;min-width:200px;font-family:system-ui,sans-serif;color:#e4e4e7;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <div style="width:32px;height:32px;background:#4f46e520;border:1px solid #4f46e540;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#818cf8;font-size:13px;">${courier.full_name.charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-weight:700;font-size:13px;">${courier.full_name}</div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;"></span>
          <span style="font-size:11px;color:${color};">${STATUS_LABELS[courier.status] ?? courier.status}</span>
        </div>
      </div>
    </div>
    <div style="color:#71717a;font-size:11px;">Dernière position : ${lastSeen}</div>
    ${orderInfo}
  </div>`;
}

function buildDestMarker(L: any, order: NonNullable<MapCourier["active_order"]>) {
  return L.marker([order.delivery_lat!, order.delivery_lng!], {
    icon: L.divIcon({
      className: "", iconSize: [28, 28], iconAnchor: [14, 14],
      html: `<div style="width:28px;height:28px;background:#ef444422;border:2px solid #ef4444;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;">📦</div>`,
    }),
  }).bindPopup(`<div style="background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:10px;font-family:system-ui;color:#e4e4e7;min-width:160px;">
    <div style="font-weight:700;font-size:12px;color:#f87171;">📦 Destination</div>
    <div style="color:#a1a1aa;font-size:11px;margin-top:4px;">${order.delivery_address}</div>
  </div>`, { className: "leaflet-popup-dark", maxWidth: 240 });
}

const LEAFLET_DARK_CSS = `
@import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
.leaflet-popup-dark .leaflet-popup-content-wrapper{background:transparent!important;box-shadow:none!important;padding:0!important;border-radius:12px!important;overflow:hidden}
.leaflet-popup-dark .leaflet-popup-content{margin:0!important}
.leaflet-popup-dark .leaflet-popup-tip-container{display:none}
.leaflet-control-zoom{border:none!important;box-shadow:none!important}
.leaflet-control-zoom a{background:#18181b!important;color:#a1a1aa!important;border:1px solid #3f3f46!important;width:30px!important;height:30px!important;line-height:28px!important;font-size:16px!important;transition:all .15s}
.leaflet-control-zoom a:hover{background:#27272a!important;color:#e4e4e7!important}
.leaflet-control-attribution{background:#18181b99!important;color:#52525b!important;font-size:10px!important}
.leaflet-control-attribution a{color:#71717a!important}
`;
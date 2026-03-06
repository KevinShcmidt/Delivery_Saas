/**
 * modules/map/lib/routing.ts
 * ─────────────────────────────────────────────
 * Récupère une route exacte via OSRM (gratuit, open source)
 * API publique : router.project-osrm.org
 */

export interface RoutePoint {
    lat: number;
    lng: number;
  }
  
  export interface Route {
    points:      RoutePoint[];
    distanceKm:  number;
    durationMin: number;
  }
  
  /**
   * Récupère la route routière exacte entre deux points via OSRM
   * OSRM attend [lng, lat] (GeoJSON) → on retourne [lat, lng] (Leaflet)
   */
  export async function fetchRoute(
    from: [number, number],
    to:   [number, number]
  ): Promise<Route | null> {
    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${from[1]},${from[0]};${to[1]},${to[0]}` +
        `?overview=full&geometries=geojson&steps=false`;
  
      const res = await fetch(url);
      if (!res.ok) return null;
  
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return null;
  
      const route = data.routes[0];
  
      // GeoJSON [lng, lat] → Leaflet [lat, lng]
      const points: RoutePoint[] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => ({ lat, lng })
      );
  
      return {
        points,
        distanceKm:  Math.round(route.distance / 100) / 10,
        durationMin: Math.round(route.duration / 60),
      };
    } catch (err) {
      console.error("[Routing] fetchRoute error:", err);
      return null;
    }
  }
  
  /**
   * Trajets prédéfinis autour d'Antananarivo
   */
  export const TANA_ROUTES: {
    label: string;
    from:  [number, number];
    to:    [number, number];
  }[] = [
    { label: "Analakely → Itaosy",           from: [-18.9137, 47.5361], to: [-18.9300, 47.4900] },
    { label: "Analakely → Analamahitsy",      from: [-18.9137, 47.5361], to: [-18.8800, 47.5250] },
    { label: "Analakely → Ambohimanarina",    from: [-18.9137, 47.5361], to: [-18.9000, 47.4900] },
    { label: "Tsaralalàna → Isotry",          from: [-18.9050, 47.5350], to: [-18.9200, 47.5200] },
    { label: "Ambodivona → Ampefiloha",       from: [-18.8950, 47.5450], to: [-18.9100, 47.5250] },
    { label: "Itaosy → Analamahitsy",         from: [-18.9300, 47.4900], to: [-18.8800, 47.5250] },
    { label: "Ampefiloha → Ambodivona",       from: [-18.9100, 47.5250], to: [-18.8950, 47.5450] },
  ];
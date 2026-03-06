/**
 * providers/SidebarProvider.tsx
 * Persiste l'état collapsed dans localStorage.
 *
 * ⚠️  HACK DOCUMENTÉ — initialisation lazy de useState
 * On ne peut pas lire localStorage directement dans useState(() => ...)
 * car le composant est rendu côté serveur (SSR) où localStorage n'existe pas.
 * Solution : on initialise à false (SSR-safe), puis on lit localStorage
 * dans useEffect avec une ref pour éviter le setState synchrone dans l'effet.
 */

"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";

interface SidebarContextValue {
  collapsed:    boolean;
  setCollapsed: (v: boolean) => void;
  toggle:       () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed:    false,
  setCollapsed: () => {},
  toggle:       () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const initialized = useRef(false);

  // Lit localStorage une seule fois après le montage (SSR-safe)
  // On utilise une ref pour éviter le setState synchrone dans l'effet
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Lecture asynchrone — hors du corps synchrone de l'effet
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      // setTimeout(0) sort du cycle de rendu synchrone
      setTimeout(() => setCollapsedState(true), 0);
    }
  }, []);

  function setCollapsed(v: boolean) {
    setCollapsedState(v);
    localStorage.setItem("sidebar-collapsed", String(v));
  }

  function toggle() {
    setCollapsed(!collapsed);
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
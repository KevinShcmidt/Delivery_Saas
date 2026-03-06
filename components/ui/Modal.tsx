"use client";

/**
 * components/ui/Modal.tsx
 * Modal reutilisable avec overlay et fermeture Escape.
 */

import { useEffect } from "react";

interface ModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
  size?:     "sm" | "md" | "lg";
  footer?:   React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, subtitle, children, size = "md", footer }: ModalProps) {

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" }[size];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} bg-gray-900 border border-white/15 rounded-2xl shadow-2xl`}>
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-slate-500 hover:bg-gray-800 hover:text-slate-300 transition-all cursor-pointer bg-transparent shrink-0 ml-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 pb-6">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10">{footer}</div>}
      </div>
    </div>
  );
}
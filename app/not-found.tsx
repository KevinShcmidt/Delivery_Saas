"use client";

/**
 * @file app/not-found.tsx
 * @description Page 404 globale — Next.js App Router
 *
 * Placement : app/not-found.tsx
 * Next.js détecte automatiquement ce fichier et l'utilise
 * pour toutes les routes introuvables (pas besoin de [404].tsx).
 *
 * Design : industriel-livraison — sombre, typographie bold,
 * animation de colis "perdu en transit".
 */

import Link from "next/link";

// ─────────────────────────────────────────────────────────────
// Sous-composants locaux (réutilisables si besoin ailleurs)
// ─────────────────────────────────────────────────────────────

/** Icône SVG de colis animée — CSS-only, pas de dépendance */
function LostPackageIcon() {
  return (
    <div className="not-found__icon-wrapper" aria-hidden="true">
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="not-found__icon"
      >
        {/* Ombre portée */}
        <ellipse cx="60" cy="108" rx="28" ry="6" fill="rgba(0,0,0,0.35)" />

        {/* Corps du colis */}
        <rect
          x="18"
          y="38"
          width="84"
          height="64"
          rx="4"
          fill="#1e293b"
          stroke="#f97316"
          strokeWidth="2"
          className="not-found__box-body"
        />

        {/* Couvercle */}
        <rect
          x="12"
          y="26"
          width="96"
          height="18"
          rx="4"
          fill="#0f172a"
          stroke="#f97316"
          strokeWidth="2"
        />

        {/* Ruban horizontal */}
        <rect x="18" y="50" width="84" height="8" fill="#f97316" opacity="0.15" />
        <rect x="18" y="50" width="84" height="2" fill="#f97316" opacity="0.6" />

        {/* Ruban vertical */}
        <rect x="54" y="38" width="12" height="64" fill="#f97316" opacity="0.15" />
        <rect x="59" y="38" width="2" height="64" fill="#f97316" opacity="0.6" />

        {/* Point d'interrogation */}
        <text
          x="60"
          y="80"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="700"
          fill="#f97316"
          className="not-found__question-mark"
        >
          ?
        </text>

        {/* Petites étoiles / étincelles */}
        <circle cx="22" cy="22" r="2.5" fill="#f97316" opacity="0.7" className="not-found__star not-found__star--1" />
        <circle cx="98" cy="18" r="2" fill="#fb923c" opacity="0.6" className="not-found__star not-found__star--2" />
        <circle cx="105" cy="34" r="1.5" fill="#fed7aa" opacity="0.5" className="not-found__star not-found__star--3" />
        <circle cx="15" cy="38" r="1.5" fill="#f97316" opacity="0.5" className="not-found__star not-found__star--4" />
      </svg>
    </div>
  );
}

/** Badge de statut style tracking */
function StatusBadge({ label }: { label: string }) {
  return (
    <span className="not-found__badge">
      <span className="not-found__badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────

export default function NotFound() {
  return (
    <>
      {/* Styles embarqués — évite un fichier CSS séparé pour une seule page */}
      {/* NOTE : on utilise <style> inline car Next.js App Router ne permet pas
          facilement d'importer un CSS module dans not-found.tsx sans
          configuration supplémentaire. C'est un cas isolé documenté ici.
          TODO : migrer vers un CSS module quand le design system sera stabilisé. */}
      <style>{`
        /* ── Reset de base ── */
        .not-found {
          min-height: 100dvh;
          background-color: #020617;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(249,115,22,0.12) 0%, transparent 70%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 39px,
              rgba(255,255,255,0.02) 39px,
              rgba(255,255,255,0.02) 40px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 39px,
              rgba(255,255,255,0.02) 39px,
              rgba(255,255,255,0.02) 40px
            );
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          font-family: 'Geist', 'DM Sans', ui-sans-serif, system-ui, sans-serif;
          overflow: hidden;
          position: relative;
        }

        /* ── Bruit de fond ── */
        .not-found::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        /* ── Contenu centré ── */
        .not-found__content {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 480px;
          width: 100%;
          animation: not-found-fadein 0.6s ease both;
        }

        /* ── Icône ── */
        .not-found__icon-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .not-found__icon {
          width: 120px;
          height: 120px;
          animation: not-found-float 3s ease-in-out infinite;
          filter: drop-shadow(0 8px 24px rgba(249,115,22,0.25));
        }

        .not-found__box-body {
          transform-origin: center bottom;
          animation: not-found-wobble 3s ease-in-out infinite;
        }

        .not-found__question-mark {
          animation: not-found-pulse 2s ease-in-out infinite;
        }

        .not-found__star {
          animation: not-found-twinkle 2s ease-in-out infinite;
        }
        .not-found__star--1 { animation-delay: 0s; }
        .not-found__star--2 { animation-delay: 0.4s; }
        .not-found__star--3 { animation-delay: 0.8s; }
        .not-found__star--4 { animation-delay: 1.2s; }

        /* ── Badge ── */
        .not-found__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249,115,22,0.1);
          border: 1px solid rgba(249,115,22,0.25);
          color: #fb923c;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 1.5rem;
        }

        .not-found__badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f97316;
          animation: not-found-blink 1.4s ease-in-out infinite;
        }

        /* ── Titre 404 ── */
        .not-found__code {
          font-size: clamp(5rem, 20vw, 9rem);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #f8fafc;
          margin: 0 0 0.25rem;
          /* Effet de texture sur le texte */
          background: linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
        }

        .not-found__code::after {
          content: '404';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #f97316 0%, #fb923c 50%, transparent 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          opacity: 0.15;
          transform: translate(3px, 3px);
          pointer-events: none;
        }

        /* ── Sous-titre ── */
        .not-found__title {
          font-size: clamp(1.1rem, 3vw, 1.4rem);
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 0.75rem;
          letter-spacing: -0.01em;
        }

        /* ── Description ── */
        .not-found__description {
          font-size: 0.9rem;
          color: #64748b;
          line-height: 1.7;
          margin: 0 0 2.5rem;
          max-width: 360px;
          margin-left: auto;
          margin-right: auto;
        }

        /* ── Actions ── */
        .not-found__actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .not-found__btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.65rem 1.4rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          letter-spacing: -0.01em;
        }

        .not-found__btn--primary {
          background: #f97316;
          color: #fff;
          box-shadow: 0 0 0 0 rgba(249,115,22,0.5);
        }

        .not-found__btn--primary:hover {
          background: #ea6e0a;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(249,115,22,0.3);
        }

        .not-found__btn--primary:active {
          transform: translateY(0);
        }

        .not-found__btn--ghost {
          background: transparent;
          color: #94a3b8;
          border: 1px solid rgba(148,163,184,0.2);
        }

        .not-found__btn--ghost:hover {
          background: rgba(148,163,184,0.06);
          color: #cbd5e1;
          border-color: rgba(148,163,184,0.35);
          transform: translateY(-1px);
        }

        /* ── Divider info ── */
        .not-found__divider {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.75rem;
          color: #334155;
          letter-spacing: 0.03em;
        }

        .not-found__divider span {
          color: #475569;
        }

        /* ── Keyframes ── */
        @keyframes not-found-fadein {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes not-found-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }

        @keyframes not-found-wobble {
          0%, 100% { transform: rotate(0deg); }
          25%       { transform: rotate(-1.5deg); }
          75%       { transform: rotate(1.5deg); }
        }

        @keyframes not-found-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        @keyframes not-found-twinkle {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 0.15; transform: scale(0.5); }
        }

        @keyframes not-found-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .not-found__actions {
            flex-direction: column;
            align-items: center;
          }
          .not-found__btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <main className="not-found" role="main">
        <div className="not-found__content">

          {/* Badge de statut */}
          <StatusBadge label="Erreur de livraison" />

          {/* Illustration */}
          <LostPackageIcon />

          {/* Code d'erreur */}
          <h1 className="not-found__code" aria-label="Erreur 404">
            404
          </h1>

          {/* Message */}
          <p className="not-found__title">
            Colis introuvable
          </p>
          <p className="not-found__description">
            Cette page s&apos;est perdue en transit. Elle n&apos;existe pas
            ou a été déplacée vers une autre adresse.
          </p>

          <nav className="not-found__actions" aria-label="Navigation de récupération">
  <button
    onClick={() => (window.location.href = "/dashboard")}
    className="not-found__btn not-found__btn--primary"
    type="button"
  >
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>

    Tableau de bord
  </button>

  <button
    onClick={() => (window.location.href = "/orders")}
    className="not-found__btn not-found__btn--ghost"
    type="button"
  >
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" />
    </svg>

    Voir les commandes
  </button>
</nav>

          {/* Info bas de page */}
          <p className="not-found__divider">
            Code : <span>NOT_FOUND_404</span> · Delivery SaaS
          </p>
        </div>
      </main>
    </>
  );
}
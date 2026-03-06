/**
 * components/ui/EmptyState.tsx
 * Etat vide generique pour les listes et tableaux.
 *
 * @example
 * <EmptyState
 *   title="Aucune commande"
 *   description="Les commandes apparaitront ici."
 *   action={<Button>Creer une commande</Button>}
 * />
 */

interface EmptyStateProps {
    title:        string;
    description?: string;
    icon?:        React.ReactNode;
    action?:      React.ReactNode;
  }
  
  const DefaultIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-700">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    </svg>
  );
  
  export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-white/10 flex items-center justify-center mb-4">
          {icon ?? <DefaultIcon />}
        </div>
        <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-slate-600 max-w-xs mb-5">{description}</p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  }
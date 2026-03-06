/**
 * components/ui/PageHeader.tsx
 */

interface PageHeaderProps {
  title:    string;
  subtitle?: string;
  action?:   React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-7 w-full max-w-full">
      {/* L'astuce ici : flex-1 + min-w-0 
         Cela force ce bloc à prendre la place restante SANS pousser le voisin.
      */}
      <div className="flex-1 min-w-0"> 
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>

      {/* shrink-0 garantit que le bouton garde sa taille et ne sort pas */}
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
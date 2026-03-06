/**
 * components/ui/Button.tsx
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:   "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?:      "sm" | "md" | "lg";
    loading?:   boolean;
    icon?:      React.ReactNode;
    iconRight?: React.ReactNode;
  }
  
  const VARIANTS = {
    primary:   "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-lg shadow-indigo-500/20",
    secondary: "bg-gray-800 hover:bg-gray-700 text-slate-200 border-white/10",
    outline:   "bg-transparent hover:bg-white/5 text-slate-300 border-white/15 hover:border-white/25",
    ghost:     "bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200 border-transparent",
    danger:    "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/25",
  };
  
  const SIZES = {
    sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
    md: "text-sm px-4 py-2 gap-2 rounded-lg",
    lg: "text-sm px-5 py-2.5 gap-2 rounded-xl",
  };
  
  const Spinner = () => (
    <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
  
  export default function Button({
    variant = "primary", size = "md", loading = false,
    icon, iconRight, children, disabled, className = "", ...props
  }: ButtonProps) {
    const isDisabled = disabled || loading;
    return (
      <button
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-semibold border transition-all duration-150 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        {...props}
      >
        {loading ? <Spinner /> : icon && <span className="shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
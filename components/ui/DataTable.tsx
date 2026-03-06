"use client";
/**
 * components/ui/DataTable.tsx
 * Tableau de données réutilisable avec colonnes configurables.
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: "name", label: "Nom" },
 *     { key: "status", label: "Statut", render: (row) => <Badge status={row.status} /> },
 *   ]}
 *   data={couriers}
 *   loading={isLoading}
 *   onRowClick={(row) => router.push("/couriers/" + row.id)}
 * />
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column<T> {
    key:     keyof T | string;
    label:   string;
    render?: (row: T) => React.ReactNode;
    align?:  "left" | "center" | "right";
    width?:  string;
  }
  
  interface DataTableProps<T> {
    columns:       Column<T>[];
    data:          T[];
    loading?:      boolean;
    emptyMessage?: string;
    onRowClick?:   (row: T) => void;
    skeletonRows?: number;
  }
  
  // ─── Composant ────────────────────────────────────────────────────────────────
  
  export default function DataTable<T extends { id?: string }>({
    columns,
    data,
    loading      = false,
    emptyMessage = "Aucun résultat",
    onRowClick,
    skeletonRows = 5,
  }: DataTableProps<T>) {
  
    const getAlign = (align?: "left" | "center" | "right") =>
      align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  
    return (
      <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
  
            {/* En-têtes */}
            <thead>
              <tr className="border-b border-white/10">
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${getAlign(col.align)}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
  
            <tbody>
              {/* Skeleton */}
              {loading && Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="border-b border-white/10 last:border-0">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
  
              {/* Données */}
              {!loading && data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-white/10 last:border-0 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-white/[0.02]" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={`px-4 py-3 text-sm text-slate-400 ${getAlign(col.align)}`}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[String(col.key)] ?? "—")
                      }
                    </td>
                  ))}
                </tr>
              ))}
  
              {/* Vide */}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-slate-700">
                        <path d="M3 7h18M3 12h18M3 17h18"/>
                      </svg>
                      <span className="text-sm text-slate-600">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
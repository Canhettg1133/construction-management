import { cn } from "../utils/cn";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  loading,
  emptyText = "Không có dữ liệu",
  className,
}: TableProps<T>) {
  const alignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className={cn("w-full", className)}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    alignClass(col.align)
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className={cn("w-full", className)}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    alignClass(col.align)
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className="py-12 text-center text-sm text-slate-500">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className={cn("w-full", className)}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                    alignClass(col.align),
                    col.sortable && "cursor-pointer select-none hover:text-slate-700"
                  )}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                >
                  <div className={cn("inline-flex items-center gap-1.5", alignClass(col.align))}>
                    {col.header}
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUp
                          className={cn(
                            "-mb-1.5 h-3 w-3",
                            sortKey === col.key && sortDir === "asc" ? "text-brand-600" : "text-slate-300"
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            "-mt-1.5 h-3 w-3",
                            sortKey === col.key && sortDir === "desc" ? "text-brand-600" : "text-slate-300"
                          )}
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  "border-b border-slate-100 last:border-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-sm text-slate-700", alignClass(col.align))}
                  >
                    {col.render ? col.render(row, index) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

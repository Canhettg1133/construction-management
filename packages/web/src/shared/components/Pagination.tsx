import { cn } from "../utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSibling = Math.max(page - siblingCount, 1);
    const rightSibling = Math.min(page + siblingCount, totalPages);

    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftRange = Array.from({ length: 5 }, (_, i) => i + 1);
      return [...leftRange, totalPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightRange = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
      return [1, ...rightRange];
    }

    if (showLeftDots && showRightDots) {
      const middle = Array.from({ length: rightSibling - leftSibling + 1 }, (_, i) => leftSibling + i);
      return [1, "dots-left", ...middle, "dots-right", totalPages];
    }

    return [];
  };

  const rangeLabel = () => {
    if (!totalItems || !pageSize) return null;
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalItems);
    return (
      <span className="mr-auto text-xs text-slate-500">
        Hiển thị {start}–{end} của {totalItems} kết quả
      </span>
    );
  };

  if (totalPages <= 1 && !totalItems) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {rangeLabel()}

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            canPrev
              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "cursor-not-allowed text-slate-300"
          )}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === "dots-left" || p === "dots-right" ? (
            <span key={`dots-${idx}`} className="flex h-8 w-8 items-center justify-center text-sm text-slate-400">
              •••
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                "flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors",
                page === p
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            canNext
              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "cursor-not-allowed text-slate-300"
          )}
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

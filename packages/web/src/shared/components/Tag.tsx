import { cn } from "../utils/cn";

interface TagProps {
  label: string;
  variant?: "default" | "solid" | "outline";
  color?: "slate" | "brand" | "red" | "emerald" | "amber";
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const colorMap = {
  slate: {
    default: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    solid: "bg-slate-600 text-white",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-100",
  },
  brand: {
    default: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    solid: "bg-brand-600 text-white",
    outline: "border border-brand-300 text-brand-700 hover:bg-brand-50",
  },
  red: {
    default: "bg-red-50 text-red-700 hover:bg-red-100",
    solid: "bg-red-600 text-white",
    outline: "border border-red-300 text-red-700 hover:bg-red-50",
  },
  emerald: {
    default: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    solid: "bg-emerald-600 text-white",
    outline: "border border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  },
  amber: {
    default: "bg-amber-50 text-amber-700 hover:bg-amber-100",
    solid: "bg-amber-600 text-white",
    outline: "border border-amber-300 text-amber-700 hover:bg-amber-50",
  },
};

const removeColors = {
  slate: "hover:bg-slate-200 hover:text-slate-900",
  brand: "hover:bg-brand-200 hover:text-brand-900",
  red: "hover:bg-red-200 hover:text-red-900",
  emerald: "hover:bg-emerald-200 hover:text-emerald-900",
  amber: "hover:bg-amber-200 hover:text-amber-900",
};

export function Tag({ label, variant = "default", color = "slate", removable, onRemove, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
        colorMap[color][variant],
        className
      )}
    >
      {label}
      {removable && (
        <button
          onClick={onRemove}
          className={cn(
            "ml-0.5 rounded-md p-0.5 transition-colors focus:outline-none focus:ring-1",
            removeColors[color]
          )}
          aria-label={`Remove ${label}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

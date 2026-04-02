import { useState, useRef, useEffect } from "react";
import { cn } from "../utils/cn";

interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, onSelect, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled || item.divider) return;
    onSelect(item.value);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
            "animate-[dropdown-in_150ms_ease-out]"
          )}
        >
          {items.map((item, idx) =>
            item.divider ? (
              <div key={`divider-${idx}`} className="my-1 border-t border-slate-100" />
            ) : (
              <button
                key={item.value}
                onClick={() => handleSelect(item)}
                disabled={item.disabled}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  item.disabled
                    ? "cursor-not-allowed text-slate-300"
                    : item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

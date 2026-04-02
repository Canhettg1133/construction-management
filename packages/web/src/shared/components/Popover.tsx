import { useState, useRef, useEffect } from "react";
import { cn } from "../utils/cn";

interface PopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  contentClassName?: string;
}

export function Popover({ trigger, children, align = "start", side = "bottom", className, contentClassName }: PopoverProps) {
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

  const placements = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const alignClass = {
    start: "origin-top-left",
    center: "origin-top",
    end: "origin-top-right",
  };

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>

      {open && (
        <div
          className={cn(
            "absolute z-50 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg",
            placements[side],
            alignClass[align],
            "animate-[dropdown-in_150ms_ease-out]",
            contentClassName
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: "left" | "right";
  title?: string;
  width?: string;
  className?: string;
}

export function Drawer({
  open,
  onClose,
  children,
  position = "right",
  title,
  width = "w-80",
  className,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const isRight = position === "right";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-[fade-in_150ms_ease-out]" />
      <div
        className={cn(
          "fixed inset-y-0 bg-white shadow-xl transition-transform duration-300 ease-in-out",
          width,
          isRight ? "right-0" : "left-0",
          isRight ? (open ? "translate-x-0" : "translate-x-full") : open ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

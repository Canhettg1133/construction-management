import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotificationStore, selectUnreadCount } from "../../store/notificationStore";
import { NotificationDropdown } from "./NotificationDropdown";
import { cn } from "../utils/cn";

interface NotificationBellProps {
  variant?: "header" | "sidebar";
  className?: string;
}

export function NotificationBell({ variant = "header", className }: NotificationBellProps) {
  const unreadCount = useNotificationStore(selectUnreadCount);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!open) return;
    void fetchNotifications(1, 20);

    const onDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [fetchNotifications, open]);

  const buttonClass =
    variant === "sidebar"
      ? "relative w-full rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100"
      : "relative rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={buttonClass}
        aria-label="Thong bao"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? <NotificationDropdown onClose={() => setOpen(false)} /> : null}
    </div>
  );
}


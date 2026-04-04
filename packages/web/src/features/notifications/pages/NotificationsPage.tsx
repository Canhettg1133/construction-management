import { useEffect } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useNotificationStore } from "../../../store/notificationStore";

export function NotificationsPage() {
  const notifications = useNotificationStore((state) => state.notifications);
  const initialized = useNotificationStore((state) => state.initialized);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  useEffect(() => {
    void fetchNotifications(1, 50);
  }, [fetchNotifications]);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1>Thong bao</h1>
          <p className="page-subtitle">Danh sach thong bao moi nhat cua ban.</p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100"
          >
            Danh dau tat ca da doc
          </button>
        ) : null}
      </div>

      {!initialized ? (
        <div className="app-card py-10 text-center text-sm text-slate-500">Dang tai thong bao...</div>
      ) : notifications.length === 0 ? (
        <div className="app-card py-10 text-center text-sm text-slate-500">Khong co thong bao nao.</div>
      ) : (
        <div className="app-card divide-y divide-slate-100 p-0">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => (!notification.isRead ? void markAsRead(notification.id) : undefined)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                !notification.isRead ? "bg-brand-50/40" : ""
              }`}
            >
              <div className="rounded-lg bg-slate-100 p-1.5">
                {notification.isRead ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <BellRing className="h-3.5 w-3.5 text-brand-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${notification.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"}`}>
                  {notification.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(notification.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


import { useMemo } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  ShieldAlert,
  Warehouse,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Notification, NotificationType } from "@construction/shared";
import { useNotificationStore } from "../../store/notificationStore";
import { cn } from "../utils/cn";

interface NotificationDropdownProps {
  onClose: () => void;
  className?: string;
}

interface NotificationPresentation {
  icon: React.ComponentType<{ className?: string }>;
  dotColor: string;
}

function presentationByType(type: NotificationType): NotificationPresentation {
  if (type === "TASK_OVERDUE" || type === "SAFETY_VIOLATION") {
    return { icon: AlertTriangle, dotColor: "bg-red-500" };
  }
  if (type === "TASK_DEADLINE_SOON") {
    return { icon: Clock3, dotColor: "bg-amber-500" };
  }
  if (
    type === "REPORT_PENDING_APPROVAL" ||
    type === "SAFETY_REPORT_PENDING" ||
    type === "QUALITY_REPORT_PENDING" ||
    type === "TRANSACTION_PENDING"
  ) {
    return { icon: ClipboardCheck, dotColor: "bg-amber-500" };
  }
  if (type === "LOW_STOCK_ALERT") {
    return { icon: Warehouse, dotColor: "bg-orange-500" };
  }
  if (type === "PROJECT_PROGRESS_UPDATE") {
    return { icon: CheckCircle2, dotColor: "bg-emerald-500" };
  }
  if (type === "TASK_ASSIGNED") {
    return { icon: FileCheck2, dotColor: "bg-brand-500" };
  }
  if (type === "ERROR") {
    return { icon: AlertTriangle, dotColor: "bg-red-500" };
  }
  if (type === "WARNING") {
    return { icon: AlertTriangle, dotColor: "bg-amber-500" };
  }
  if (type === "SUCCESS") {
    return { icon: CheckCircle2, dotColor: "bg-emerald-500" };
  }
  if (type === "INFO") {
    return { icon: BellRing, dotColor: "bg-sky-500" };
  }
  return { icon: ShieldAlert, dotColor: "bg-slate-400" };
}

function resolveNotificationLink(notification: Notification): string {
  if (notification.link) {
    return notification.link;
  }

  const data =
    notification.data && typeof notification.data === "object" && !Array.isArray(notification.data)
      ? (notification.data as Record<string, unknown>)
      : null;

  const dataLink = typeof data?.link === "string" ? data.link : null;
  if (dataLink) {
    return dataLink;
  }

  const projectId = typeof data?.projectId === "string" ? data.projectId : null;
  const taskId = typeof data?.taskId === "string" ? data.taskId : null;
  const reportId = typeof data?.reportId === "string" ? data.reportId : null;
  const inventoryId = typeof data?.inventoryId === "string" ? data.inventoryId : null;
  const transactionId = typeof data?.transactionId === "string" ? data.transactionId : null;

  if (projectId && taskId) {
    return `/projects/${projectId}/tasks/${taskId}`;
  }
  if (projectId && reportId && notification.type === "SAFETY_REPORT_PENDING") {
    return `/projects/${projectId}/safety/${reportId}`;
  }
  if (projectId && reportId && notification.type === "QUALITY_REPORT_PENDING") {
    return `/projects/${projectId}/quality/${reportId}`;
  }
  if (projectId && reportId) {
    return `/projects/${projectId}/reports/${reportId}`;
  }
  if (projectId && (inventoryId || transactionId)) {
    return `/projects/${projectId}/warehouse`;
  }

  return "/dashboard";
}

export function NotificationDropdown({ onClose, className }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const initialized = useNotificationStore((state) => state.initialized);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  const orderedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [notifications]
  );

  const handleItemClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    navigate(resolveNotificationLink(notification));
    onClose();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    navigate("/notifications");
    onClose();
  };

  return (
    <div
      className={cn(
        "absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Thong bao</h3>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Danh dau tat ca da doc
          </button>
        ) : null}
      </div>

      {!initialized ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">Dang tai thong bao...</div>
      ) : orderedNotifications.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">Khong co thong bao nao</div>
      ) : (
        <div className="max-h-[24rem] overflow-y-auto">
          {orderedNotifications.slice(0, 20).map((notification) => {
            const presentation = presentationByType(notification.type);
            const Icon = presentation.icon;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleItemClick(notification)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                  !notification.isRead && "bg-brand-50/40"
                )}
              >
                <div className="mt-0.5 rounded-lg bg-slate-100 p-1.5">
                  <Icon className="h-3.5 w-3.5 text-slate-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm",
                      !notification.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                    )}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(notification.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                {!notification.isRead ? (
                  <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${presentation.dotColor}`} />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-200 px-4 py-2">
        <button
          type="button"
          onClick={handleViewAll}
          className="w-full rounded-lg px-2 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
        >
          Xem tat ca
        </button>
      </div>
    </div>
  );
}


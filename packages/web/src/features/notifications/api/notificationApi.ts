import type { Notification, NotificationType } from "@construction/shared";
import api from "../../../config/api";

interface NotificationListPayload {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse<T> {
  success: true;
  data: T;
}

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
}) {
  const res = await api.get<ApiResponse<NotificationListPayload>>("/notifications", { params });
  return res.data.data;
}

export async function getNotificationCount() {
  const res = await api.get<ApiResponse<{ count: number }>>("/notifications/count");
  return res.data.data.count;
}

export async function markAsRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead() {
  await api.patch("/notifications/read-all");
}

// Backward-compatible aliases
export async function listNotifications(params?: { page?: number; pageSize?: number }) {
  const payload = await getNotifications({
    page: params?.page,
    limit: params?.pageSize,
  });
  return {
    notifications: payload.data,
    meta: {
      page: payload.page,
      pageSize: payload.limit,
      total: payload.total,
      totalPages: payload.limit > 0 ? Math.ceil(payload.total / payload.limit) : 0,
    },
  };
}

export async function getUnreadCount() {
  return getNotificationCount();
}

export async function markNotificationAsRead(id: string) {
  return markAsRead(id);
}

export async function markAllNotificationsAsRead() {
  return markAllAsRead();
}


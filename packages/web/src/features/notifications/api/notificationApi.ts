import api from "../../../config/api";
import type { Notification } from "@construction/shared";

interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export async function listNotifications(params?: { page?: number; pageSize?: number }) {
  const res = await api.get<ApiListResponse<Notification>>("/notifications", { params });
  return { notifications: res.data.data, meta: res.data.meta };
}

export async function getUnreadCount() {
  const res = await api.get<ApiSingleResponse<{ unreadCount: number }>>("/notifications/unread-count");
  return res.data.data.unreadCount;
}

export async function markNotificationAsRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsAsRead() {
  await api.patch("/notifications/read-all");
}

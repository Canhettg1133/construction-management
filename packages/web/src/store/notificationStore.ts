import { create } from "zustand";
import type { Notification } from "@construction/shared";
import {
  listNotifications,
  getUnreadCount as getUnreadCountApi,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../features/notifications/api/notificationApi";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  panelOpen: boolean;
  initialized: boolean;
  setPanelOpen: (open: boolean) => void;
  fetchNotifications: (page?: number, pageSize?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  setUnreadCount: (count: number) => void;
}

export const selectUnreadCount = (state: NotificationState) => state.unreadCount;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  panelOpen: false,
  initialized: false,

  setPanelOpen: (open) => set({ panelOpen: open }),

  fetchNotifications: async (page = 1, pageSize = 20) => {
    try {
      const { notifications } = await listNotifications({ page, pageSize });
      set({ notifications, initialized: true });
    } catch {
      set({ initialized: true });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await getUnreadCountApi();
      set({ unreadCount: count });
    } catch {
      // Silently fail
    }
  },

  markAsRead: async (id) => {
    await markNotificationAsRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async () => {
    await markAllNotificationsAsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setUnreadCount: (count) => {
    set({ unreadCount: count });
  },
}));

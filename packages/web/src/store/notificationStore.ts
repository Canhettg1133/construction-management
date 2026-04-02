import { create } from "zustand";

export interface Notification {
  id: string;
  title: string;
  message?: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}

interface NotificationState {
  notifications: Notification[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  addNotification: (n: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  get unreadCount() { return this.notifications.filter((n) => !n.read).length; }
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-1",
    title: "Báo cáo ngày mới",
    message: "Nguyễn Văn A đã gửi báo cáo ngày 02/04/2026 cho dự án Khu đô thị Phú Mỹ.",
    type: "info",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    link: "/projects/proj-1/reports",
  },
  {
    id: "notif-2",
    title: "Công việc quá hạn",
    message: "Công việc 'Kiểm tra kết cấu tầng 3' đã quá hạn 2 ngày.",
    type: "warning",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    link: "/projects/proj-1/tasks",
  },
  {
    id: "notif-3",
    title: "Thành viên mới được thêm",
    message: "Trần Thị B đã được thêm vào dự án Công trình Trung tâm Thương mại.",
    type: "success",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    link: "/projects/proj-2/members",
  },
];

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: SAMPLE_NOTIFICATIONS,
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open }),
  addNotification: (n) =>
    set((state) => ({
      notifications: [
        {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ],
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
}));

import { io, Socket } from "socket.io-client";
import { useNotificationStore } from "../store/notificationStore";

let socket: Socket | null = null;

function getAccessToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function connectSocket(): void {
  const token = getAccessToken();
  if (!token) return;

  const apiUrl = (import.meta.env.VITE_API_URL || "/api/v1") === "/api/v1"
    ? window.location.origin
    : (import.meta.env.VITE_API_URL as string);

  socket = io(apiUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  socket.on("notification", (notification) => {
    useNotificationStore.getState().addNotification(notification);
  });

  socket.on("unread-count", ({ unreadCount }: { unreadCount: number }) => {
    useNotificationStore.getState().setUnreadCount(unreadCount);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

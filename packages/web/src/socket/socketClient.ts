import { io, Socket } from 'socket.io-client'
import { useNotificationStore } from '../store/notificationStore'

let socket: Socket | null = null

function getSocketUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined
  if (!apiUrl || apiUrl === '/api/v1') {
    return window.location.origin
  }
  return apiUrl.replace(/\/api\/v1\/?$/, '')
}

export function connectSocket(): void {
  if (socket?.connected) return

  socket = io(getSocketUrl(), {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message)
  })

  socket.on('notification', (notification) => {
    useNotificationStore.getState().addNotification(notification)
  })

  socket.on('unread-count', ({ unreadCount }: { unreadCount: number }) => {
    useNotificationStore.getState().setUnreadCount(unreadCount)
  })
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

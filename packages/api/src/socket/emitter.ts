import { getIO } from './index'
import { logger } from '../config/logger'
import type { NotificationType } from '@construction/shared'

export type NotificationPayload = {
  id: string
  title: string
  message: string
  type: NotificationType
  data?: Record<string, unknown> | null
  isRead: boolean
  link?: string | null
  createdAt: string
}

export function emitNotification(userId: string, notification: NotificationPayload): void {
  try {
    getIO().to(`user:${userId}`).emit('notification', notification)
    logger.debug({ userId, notificationId: notification.id }, 'Notification pushed via WebSocket')
  } catch (err) {
    logger.error({ err, userId }, 'Failed to emit notification via WebSocket')
  }
}

export function emitUnreadCount(userId: string, count: number): void {
  try {
    getIO().to(`user:${userId}`).emit('unread-count', { unreadCount: count })
  } catch (err) {
    logger.error({ err, userId }, 'Failed to emit unread count via WebSocket')
  }
}

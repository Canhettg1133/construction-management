import { NotificationType } from '@prisma/client'
import type { Prisma, ProjectRole } from '@prisma/client'
import { emitNotification, emitUnreadCount } from '../../socket/emitter'
import { notificationRepository } from './notification.repository'

function parsePage(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function parseLimit(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 20
  return Math.min(100, Math.floor(parsed))
}

function parseIsRead(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return undefined
}

function parseType(value: unknown): NotificationType | undefined {
  if (!value) return undefined
  const normalized = String(value).trim()
  const values = Object.values(NotificationType) as NotificationType[]
  return values.includes(normalized as NotificationType) ? (normalized as NotificationType) : undefined
}

function normalizeUserIds(userIds: string[]): string[] {
  return Array.from(new Set(userIds.filter(Boolean)))
}

function toSocketPayload(notification: {
  id: string
  type: NotificationType
  title: string
  message: string
  data: Prisma.JsonValue | null
  isRead: boolean
  createdAt: Date
}) {
  const data =
    notification.data && typeof notification.data === 'object' && !Array.isArray(notification.data)
      ? (notification.data as Record<string, unknown>)
      : null

  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data,
    link: typeof data?.link === 'string' ? data.link : null,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  }
}

export const notificationService = {
  async list(userId: string, query: { page?: unknown; limit?: unknown; type?: unknown; isRead?: unknown }) {
    const page = parsePage(query.page)
    const limit = parseLimit(query.limit)
    const type = parseType(query.type)
    const isRead = parseIsRead(query.isRead)
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      notificationRepository.findByUser(userId, {
        skip,
        take: limit,
        type,
        isRead,
      }),
      notificationRepository.countByUser(userId, {
        type,
        isRead,
      }),
    ])

    return {
      data,
      total,
      page,
      limit,
    }
  },

  getUnreadCount(userId: string) {
    return notificationRepository.countUnreadByUser(userId)
  },

  async create(payload: {
    userId: string
    type: NotificationType
    title: string
    message: string
    data?: Prisma.InputJsonValue
  }) {
    const notification = await notificationRepository.create(payload)
    const unreadCount = await notificationRepository.countUnreadByUser(payload.userId)

    emitNotification(payload.userId, toSocketPayload(notification))
    emitUnreadCount(payload.userId, unreadCount)

    return notification
  },

  async createMany(
    userIds: string[],
    payload: {
      type: NotificationType
      title: string
      message: string
      data?: Prisma.InputJsonValue
    },
  ) {
    const uniqueUserIds = normalizeUserIds(userIds)
    if (uniqueUserIds.length === 0) {
      return []
    }

    const notifications = await Promise.all(
      uniqueUserIds.map((userId) =>
        notificationRepository.create({
          userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data,
        }),
      ),
    )

    await Promise.all(
      notifications.map(async (notification) => {
        const unreadCount = await notificationRepository.countUnreadByUser(notification.userId)
        emitNotification(notification.userId, toSocketPayload(notification))
        emitUnreadCount(notification.userId, unreadCount)
      }),
    )

    return notifications
  },

  async notifyProjectRoles(
    projectId: string,
    roles: ProjectRole[],
    payload: {
      type: NotificationType
      title: string
      message: string
      data?: Prisma.InputJsonValue
    },
  ) {
    const userIds = await notificationRepository.findProjectMemberUserIdsByRoles(projectId, roles)
    return this.createMany(userIds, payload)
  },

  async notifyAdmins(payload: {
    type: NotificationType
    title: string
    message: string
    data?: Prisma.InputJsonValue
  }) {
    const userIds = await notificationRepository.findAdminUserIds()
    return this.createMany(userIds, payload)
  },

  async notifyProjectRolesAndAdmins(
    projectId: string,
    roles: ProjectRole[],
    payload: {
      type: NotificationType
      title: string
      message: string
      data?: Prisma.InputJsonValue
    },
  ) {
    const [roleUserIds, adminUserIds] = await Promise.all([
      notificationRepository.findProjectMemberUserIdsByRoles(projectId, roles),
      notificationRepository.findAdminUserIds(),
    ])
    return this.createMany([...roleUserIds, ...adminUserIds], payload)
  },

  async markAsRead(id: string, userId: string) {
    const updated = await notificationRepository.markAsRead(id, userId)
    const unreadCount = await notificationRepository.countUnreadByUser(userId)
    emitUnreadCount(userId, unreadCount)
    return updated.count > 0
  },

  async markAllAsRead(userId: string) {
    const updated = await notificationRepository.markAllAsRead(userId)
    emitUnreadCount(userId, 0)
    return updated.count
  },
}

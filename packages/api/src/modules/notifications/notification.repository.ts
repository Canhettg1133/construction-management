import { prisma } from '../../config/database'
import type { Prisma } from '@prisma/client'
import type { NotificationType, ProjectRole } from '@prisma/client'

interface NotificationFilters {
  type?: NotificationType
  isRead?: boolean
}

export const notificationRepository = {
  findByUser(
    userId: string,
    options: {
      skip: number
      take: number
      type?: NotificationType
      isRead?: boolean
    },
  ) {
    const where: Prisma.NotificationWhereInput = { userId }
    if (options.type) where.type = options.type
    if (options.isRead !== undefined) where.isRead = options.isRead

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: options.skip,
      take: options.take,
    })
  },

  countByUser(userId: string, filters?: NotificationFilters) {
    const where: Prisma.NotificationWhereInput = { userId }
    if (filters?.type) where.type = filters.type
    if (filters?.isRead !== undefined) where.isRead = filters.isRead
    return prisma.notification.count({ where })
  },

  countUnreadByUser(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    })
  },

  create(data: {
    userId: string
    type: NotificationType
    title: string
    message: string
    data?: Prisma.InputJsonValue
  }) {
    return prisma.notification.create({ data })
  },

  createMany(
    notifications: Array<{
      userId: string
      type: NotificationType
      title: string
      message: string
      data?: Prisma.InputJsonValue
    }>,
  ) {
    if (notifications.length === 0) {
      return Promise.resolve({ count: 0 })
    }

    return prisma.notification.createMany({
      data: notifications,
      skipDuplicates: false,
    })
  },

  markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    })
  },

  markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  },

  async findProjectMemberUserIdsByRoles(projectId: string, roles: ProjectRole[]): Promise<string[]> {
    const rows = await prisma.projectMember.findMany({
      where: {
        projectId,
        role: { in: roles },
      },
      select: { userId: true },
      distinct: ['userId'],
    })
    return rows.map((row) => row.userId)
  },

  async findAdminUserIds(): Promise<string[]> {
    const rows = await prisma.user.findMany({
      where: { systemRole: 'ADMIN' },
      select: { id: true },
    })
    return rows.map((row) => row.id)
  },
}

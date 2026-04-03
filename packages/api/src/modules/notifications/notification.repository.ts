import { prisma } from "../../config/database";
import { NotificationType } from "@prisma/client";

export const notificationRepository = {
  findByUser(userId: string, page: number, pageSize: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  },

  countByUser(userId: string) {
    return prisma.notification.count({ where: { userId } });
  },

  countUnreadByUser(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  create(data: {
    userId: string;
    title: string;
    message?: string;
    type?: NotificationType;
    link?: string;
  }) {
    return prisma.notification.create({ data });
  },

  markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  },

  markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },
};

import { notificationRepository } from "./notification.repository";
import { NotificationType } from "@prisma/client";
import { parsePagination, buildPaginationMeta } from "../../shared/utils";
import { emitNotification, emitUnreadCount } from "../../socket/emitter";

export const notificationService = {
  async list(userId: string, page: number, pageSize: number) {
    const [notifications, total] = await Promise.all([
      notificationRepository.findByUser(userId, page, pageSize),
      notificationRepository.countByUser(userId),
    ]);
    return { notifications, total };
  },

  async getUnreadCount(userId: string) {
    return notificationRepository.countUnreadByUser(userId);
  },

  async create(data: {
    userId: string;
    title: string;
    message?: string;
    type?: NotificationType;
    link?: string;
  }) {
    const notification = await notificationRepository.create(data);

    emitNotification(data.userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });

    return notification;
  },

  async markAsRead(id: string, userId: string) {
    await notificationRepository.markAsRead(id, userId);
    const count = await notificationRepository.countUnreadByUser(userId);
    emitUnreadCount(userId, count);
  },

  async markAllAsRead(userId: string) {
    await notificationRepository.markAllAsRead(userId);
    emitUnreadCount(userId, 0);
  },

  parsePagination,
  buildPaginationMeta,
};

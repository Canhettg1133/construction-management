import { NotificationType } from "@prisma/client";
import { emitNotification } from "../../socket/emitter";
import { notificationRepository } from "./notification.repository";

export type NotificationPayload = {
  id: string;
  title: string;
  message?: string | null;
  type: NotificationType;
  isRead: boolean;
  link?: string | null;
  createdAt: Date;
};

export const notificationTriggers = {
  async taskAssigned(params: { assigneeId: string; taskId: string; taskTitle: string; projectId: string }) {
    const { assigneeId, taskId, taskTitle, projectId } = params;

    const notification = await notificationRepository.create({
      userId: assigneeId,
      title: "Bạn được giao task mới",
      message: taskTitle,
      type: "INFO",
      link: `/projects/${projectId}/tasks/${taskId}`,
    });

    emitNotification(assigneeId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },

  async reportSubmitted(params: { pmIds: string[]; reportId: string; reportDate: Date; projectId: string }) {
    const { pmIds, reportId, reportDate, projectId } = params;
    const dateStr = reportDate.toLocaleDateString("vi-VN");

    for (const pmId of pmIds) {
      const notification = await notificationRepository.create({
        userId: pmId,
        title: "Có báo cáo ngày mới cần duyệt",
        message: `Báo cáo ngày ${dateStr} đang chờ bạn duyệt`,
        type: "INFO",
        link: `/projects/${projectId}/reports/${reportId}`,
      });

      emitNotification(pmId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        link: notification.link,
        createdAt: notification.createdAt.toISOString(),
      });
    }
  },

  async taskSubmitted(params: { pmIds: string[]; taskId: string; taskTitle: string; projectId: string }) {
    const { pmIds, taskId, taskTitle, projectId } = params;

    for (const pmId of pmIds) {
      const notification = await notificationRepository.create({
        userId: pmId,
        title: "Có task cần duyệt",
        message: taskTitle,
        type: "INFO",
        link: `/projects/${projectId}/tasks/${taskId}`,
      });

      emitNotification(pmId, {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        link: notification.link,
        createdAt: notification.createdAt.toISOString(),
      });
    }
  },

  async reportApproved(params: { creatorId: string; reportId: string; reportDate: Date; projectId: string }) {
    const { creatorId, reportId, reportDate, projectId } = params;
    const dateStr = reportDate.toLocaleDateString("vi-VN");

    const notification = await notificationRepository.create({
      userId: creatorId,
      title: "Báo cáo đã được duyệt",
      message: `Báo cáo ngày ${dateStr} đã được duyệt`,
      type: "SUCCESS",
      link: `/projects/${projectId}/reports/${reportId}`,
    });

    emitNotification(creatorId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },

  async reportRejected(params: { creatorId: string; reportId: string; reportDate: Date; reason: string; projectId: string }) {
    const { creatorId, reportId, reportDate, reason, projectId } = params;
    const dateStr = reportDate.toLocaleDateString("vi-VN");

    const notification = await notificationRepository.create({
      userId: creatorId,
      title: "Báo cáo bị từ chối",
      message: `Báo cáo ngày ${dateStr} bị từ chối: ${reason}`,
      type: "WARNING",
      link: `/projects/${projectId}/reports/${reportId}`,
    });

    emitNotification(creatorId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },

  async taskApproved(params: { creatorId: string; taskId: string; taskTitle: string; projectId: string }) {
    const { creatorId, taskId, taskTitle, projectId } = params;

    const notification = await notificationRepository.create({
      userId: creatorId,
      title: "Task đã được duyệt",
      message: taskTitle,
      type: "SUCCESS",
      link: `/projects/${projectId}/tasks/${taskId}`,
    });

    emitNotification(creatorId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },

  async taskRejected(params: { creatorId: string; taskId: string; taskTitle: string; reason: string; projectId: string }) {
    const { creatorId, taskId, taskTitle, reason, projectId } = params;

    const notification = await notificationRepository.create({
      userId: creatorId,
      title: "Task bị từ chối",
      message: `${taskTitle} — Lý do: ${reason}`,
      type: "WARNING",
      link: `/projects/${projectId}/tasks/${taskId}`,
    });

    emitNotification(creatorId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },

  async taskDueSoon(params: { assigneeId: string; taskId: string; taskTitle: string; projectId: string; dueDate: Date }) {
    const { assigneeId, taskId, taskTitle, projectId, dueDate } = params;
    const dateStr = dueDate.toLocaleDateString("vi-VN");

    const notification = await notificationRepository.create({
      userId: assigneeId,
      title: "Task sắp quá hạn",
      message: `"${taskTitle}" cần hoàn thành trước ngày ${dateStr}`,
      type: "WARNING",
      link: `/projects/${projectId}/tasks/${taskId}`,
    });

    emitNotification(assigneeId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },

  async taskOverdue(params: { assigneeId: string; taskId: string; taskTitle: string; projectId: string }) {
    const { assigneeId, taskId, taskTitle, projectId } = params;

    const notification = await notificationRepository.create({
      userId: assigneeId,
      title: "Task đã quá hạn",
      message: `"${taskTitle}" đã quá hạn`,
      type: "ERROR",
      link: `/projects/${projectId}/tasks/${taskId}`,
    });

    emitNotification(assigneeId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      link: notification.link,
      createdAt: notification.createdAt.toISOString(),
    });
  },
};

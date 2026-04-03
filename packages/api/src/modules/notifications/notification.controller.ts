import type { Request, Response } from "express";
import { notificationService } from "./notification.service";
import { sendSuccess } from "../../shared/utils";

export const notificationController = {
  async list(req: Request, res: Response) {
    const { page = 1, pageSize = 20 } = req.query;
    const p = Number(page);
    const ps = Number(pageSize);

    const { notifications, total } = await notificationService.list(String(req.user!.id), p, ps);
    return sendSuccess(res, notifications, notificationService.buildPaginationMeta(total, p, ps));
  },

  async getUnreadCount(req: Request, res: Response) {
    const count = await notificationService.getUnreadCount(String(req.user!.id));
    return sendSuccess(res, { unreadCount: count });
  },

  async markAsRead(req: Request, res: Response) {
    await notificationService.markAsRead(String(req.params.id), String(req.user!.id));
    return sendSuccess(res, null);
  },

  async markAllAsRead(req: Request, res: Response) {
    await notificationService.markAllAsRead(String(req.user!.id));
    return sendSuccess(res, null);
  },
};

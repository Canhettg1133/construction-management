import type { Request, Response } from 'express'
import { sendSuccess } from '../../shared/utils'
import { notificationService } from './notification.service'

export const notificationController = {
  async list(req: Request, res: Response) {
    const result = await notificationService.list(String(req.user!.id), {
      page: req.query.page,
      limit: req.query.limit ?? req.query.pageSize ?? req.query.page_size,
      type: req.query.type,
      isRead: req.query.isRead,
    })

    return sendSuccess(res, {
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    })
  },

  async getUnreadCount(req: Request, res: Response) {
    const count = await notificationService.getUnreadCount(String(req.user!.id))
    return sendSuccess(res, { count })
  },

  async markAsRead(req: Request, res: Response) {
    await notificationService.markAsRead(String(req.params.id), String(req.user!.id))
    return sendSuccess(res, { success: true })
  },

  async markAllAsRead(req: Request, res: Response) {
    const count = await notificationService.markAllAsRead(String(req.user!.id))
    return sendSuccess(res, { count })
  },
}

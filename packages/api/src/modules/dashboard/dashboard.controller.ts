import type { Request, Response } from 'express'
import { dashboardService } from './dashboard.service'
import { sendSuccess } from '../../shared/utils'

export const dashboardController = {
  async getStats(req: Request, res: Response) {
    const data = await dashboardService.getStats(String(req.user!.id))
    return sendSuccess(res, data)
  },
}

import type { Request, Response } from 'express'
import { taskService } from './task.service'
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from '../../shared/utils'

export const taskController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query)
    const { tasks, total } = await taskService.list(
      String(req.params.projectId),
      page,
      pageSize,
      req.query.status as string,
      req.query.priority as string,
      req.query.assigned_to as string,
      req.query.from as string | undefined,
      req.query.to as string | undefined,
    )
    return sendSuccess(res, tasks, buildPaginationMeta(total, page, pageSize))
  },

  async getById(req: Request, res: Response) {
    const task = await taskService.getById(String(req.params.projectId), String(req.params.taskId))
    return sendSuccess(res, task)
  },

  async create(req: Request, res: Response) {
    const task = await taskService.create({
      ...req.body,
      createdBy: req.user!.id,
      projectId: String(req.params.projectId),
    })
    return sendSuccess(res, task)
  },

  async update(req: Request, res: Response) {
    const task = await taskService.update(
      String(req.params.projectId),
      String(req.params.taskId),
      req.body,
      req.user!.id,
    )
    return sendSuccess(res, task)
  },

  async updateStatus(req: Request, res: Response) {
    const task = await taskService.updateStatus(
      String(req.params.projectId),
      String(req.params.taskId),
      req.body.status,
      req.user!.id,
    )
    return sendSuccess(res, task)
  },

  async delete(req: Request, res: Response) {
    await taskService.delete(String(req.params.projectId), String(req.params.taskId), req.user!.id)
    return sendNoContent(res)
  },

  async submitForApproval(req: Request, res: Response) {
    const task = await taskService.submitForApproval(
      String(req.params.projectId),
      String(req.params.taskId),
      req.user!.id,
    )
    return sendSuccess(res, task)
  },
}

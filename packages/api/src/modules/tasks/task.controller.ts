import type { Request, Response } from "express";
import { taskService } from "./task.service";
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from "../../shared/utils";

export const taskController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { tasks, total } = await taskService.list(
      String(req.params.projectId), page, pageSize,
      req.query.status as string,
      req.query.priority as string,
      req.query.assigned_to as string
    );
    return sendSuccess(res, tasks, buildPaginationMeta(total, page, pageSize));
  },

  async getById(req: Request, res: Response) {
    const task = await taskService.getById(String(req.params.taskId));
    return sendSuccess(res, task);
  },

  async create(req: Request, res: Response) {
    const task = await taskService.create({ ...req.body, createdBy: req.user!.id, projectId: String(req.params.projectId) });
    return sendSuccess(res, task);
  },

  async update(req: Request, res: Response) {
    const task = await taskService.update(String(req.params.taskId), req.body, req.user!.id, req.user!.role);
    return sendSuccess(res, task);
  },

  async updateStatus(req: Request, res: Response) {
    const task = await taskService.updateStatus(String(req.params.taskId), req.body.status, req.user!.id, req.user!.role);
    return sendSuccess(res, task);
  },

  async delete(req: Request, res: Response) {
    await taskService.delete(String(req.params.taskId), req.user!.id);
    return sendNoContent(res);
  },
};

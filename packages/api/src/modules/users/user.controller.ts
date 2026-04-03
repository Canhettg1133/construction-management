import type { Request, Response } from "express";
import { userService } from "./user.service";
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from "../../shared/utils";

export const userController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { users, total } = await userService.list(page, pageSize, req.query.role as string, req.query.q as string);
    return sendSuccess(res, users, buildPaginationMeta(total, page, pageSize));
  },

  async getById(req: Request, res: Response) {
    const user = await userService.getById(String(req.params.id));
    return sendSuccess(res, user);
  },

  async create(req: Request, res: Response) {
    const user = await userService.create({ ...req.body, createdBy: req.user?.id });
    return sendSuccess(res, user);
  },

  async update(req: Request, res: Response) {
    const user = await userService.update(String(req.params.id), req.body, req.user?.id);
    return sendSuccess(res, user);
  },

  async toggleStatus(req: Request, res: Response) {
    const user = await userService.toggleStatus(String(req.params.id), req.body.isActive, req.user?.id);
    return sendSuccess(res, user);
  },

  async updateMe(req: Request, res: Response) {
    const user = await userService.updateMe(String(req.user!.id), req.body);
    return sendSuccess(res, user);
  },
};

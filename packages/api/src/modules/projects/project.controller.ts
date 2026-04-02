import type { Request, Response } from "express";
import { projectService } from "./project.service";
import { sendSuccess, parsePagination, buildPaginationMeta } from "../../shared/utils";

export const projectController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { projects, total } = await projectService.list(
      page, pageSize, 
      req.user!.id, req.user!.role,
      req.query.status as string, req.query.q as string
    );
    return sendSuccess(res, projects, buildPaginationMeta(total, page, pageSize));
  },

  async getById(req: Request, res: Response) {
    const project = await projectService.getById(String(req.params.id));
    return sendSuccess(res, project);
  },

  async create(req: Request, res: Response) {
    const project = await projectService.create({ ...req.body, createdBy: req.user!.id });
    return sendSuccess(res, project);
  },

  async update(req: Request, res: Response) {
    const project = await projectService.update(String(req.params.id), req.body, req.user!.id);
    return sendSuccess(res, project);
  },
};

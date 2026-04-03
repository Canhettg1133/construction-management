import type { Request, Response } from "express";
import { reportService } from "./report.service";
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from "../../shared/utils";

export const reportController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { reports, total } = await reportService.list(
      String(req.params.projectId), page, pageSize,
      req.query.from as string | undefined,
      req.query.to as string | undefined,
      req.query.created_by as string
    );
    return sendSuccess(res, reports, buildPaginationMeta(total, page, pageSize));
  },

  async getById(req: Request, res: Response) {
    const report = await reportService.getById(String(req.params.reportId));
    return sendSuccess(res, report);
  },

  async create(req: Request, res: Response) {
    const isDraft = req.query._draft === "1";
    const report = await reportService.create(
      { ...req.body, createdBy: req.user!.id, projectId: String(req.params.projectId), isDraft }
    );
    return sendSuccess(res, report);
  },

  async update(req: Request, res: Response) {
    const report = await reportService.update(String(req.params.reportId), req.body, req.user!.id, req.user!.role);
    return sendSuccess(res, report);
  },

  async updateStatus(req: Request, res: Response) {
    const report = await reportService.updateStatus(
      String(req.params.reportId),
      req.body.status,
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, report);
  },

  async delete(req: Request, res: Response) {
    await reportService.delete(String(req.params.reportId), req.user!.id);
    return sendNoContent(res);
  },

  async submitForApproval(req: Request, res: Response) {
    const report = await reportService.submitForApproval(
      String(req.params.reportId),
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, report);
  },
};

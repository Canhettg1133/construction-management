import type { Request, Response } from "express";
import { approvalService } from "./approval.service";
import { sendSuccess } from "../../shared/utils";
import { parsePagination } from "../../shared/utils/pagination";

export const approvalController = {
  async listPending(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { reports, tasks, totalReports, totalTasks } = await approvalService.listPending(
      req.user!.id,
      req.user!.role,
      page,
      pageSize
    );
    const totalItems = totalReports + totalTasks;
    return res.status(200).json({
      success: true,
      data: { reports, tasks },
      meta: { page, pageSize, total: totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    });
  },

  async approveReport(req: Request, res: Response) {
    const updated = await approvalService.approveReport(
      String(req.params.reportId),
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, updated);
  },

  async rejectReport(req: Request, res: Response) {
    const updated = await approvalService.rejectReport(
      String(req.params.reportId),
      req.user!.id,
      req.user!.role,
      req.body.reason
    );
    return sendSuccess(res, updated);
  },

  async approveTask(req: Request, res: Response) {
    const updated = await approvalService.approveTask(
      String(req.params.taskId),
      req.user!.id,
      req.user!.role
    );
    return sendSuccess(res, updated);
  },

  async rejectTask(req: Request, res: Response) {
    const updated = await approvalService.rejectTask(
      String(req.params.taskId),
      req.user!.id,
      req.user!.role,
      req.body.reason
    );
    return sendSuccess(res, updated);
  },
};

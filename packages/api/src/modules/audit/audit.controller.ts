import type { Request, Response } from "express";
import { auditService } from "./audit.service";
import { sendSuccess, parsePagination, buildPaginationMeta } from "../../shared/utils";

export const auditController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const filters: Record<string, unknown> = {
      action: req.query.action,
      entityType: req.query.entity_type,
      userId: req.query.user_id,
      from: req.query.from,
      to: req.query.to,
    };
    const { logs, total } = await auditService.list(page, pageSize, filters);
    return sendSuccess(res, logs, buildPaginationMeta(total, page, pageSize));
  },
};

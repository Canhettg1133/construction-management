import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils";
import { budgetService } from "./budget.service";
import type { ProjectRole, SystemRole } from "@construction/shared";

function readProjectId(req: Request) {
  return String(req.params.projectId ?? "");
}

function readActor(req: Request): {
  userId: string;
  systemRole: SystemRole;
  projectRole: ProjectRole | null;
} {
  return {
    userId: req.user!.id,
    systemRole: req.user!.systemRole,
    projectRole: req.userPermissions?.projectRole ?? null,
  };
}

export const budgetController = {
  async getOverview(req: Request, res: Response) {
    const data = await budgetService.getOverview(readProjectId(req));
    return sendSuccess(res, data);
  },

  async listItems(req: Request, res: Response) {
    const data = await budgetService.listItems(readProjectId(req));
    return sendSuccess(res, data);
  },

  async createItem(req: Request, res: Response) {
    const data = await budgetService.createItem(readProjectId(req), readActor(req), req.body ?? {});
    res.status(201);
    return sendSuccess(res, data);
  },

  async updateItem(req: Request, res: Response) {
    const data = await budgetService.updateItem(
      readProjectId(req),
      String(req.params.id),
      readActor(req),
      req.body ?? {}
    );
    return sendSuccess(res, data);
  },

  async createDisbursement(req: Request, res: Response) {
    const data = await budgetService.createDisbursement(readProjectId(req), readActor(req), req.body ?? {});
    res.status(201);
    return sendSuccess(res, data);
  },

  async approveDisbursement(req: Request, res: Response) {
    const data = await budgetService.approveDisbursement(
      readProjectId(req),
      String(req.params.id),
      readActor(req),
      req.body ?? {}
    );
    return sendSuccess(res, data);
  },
};

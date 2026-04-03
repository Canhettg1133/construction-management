import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils";
import { qualityService } from "./quality.service";
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

export const qualityController = {
  async list(req: Request, res: Response) {
    const data = await qualityService.listReports(readProjectId(req));
    return sendSuccess(res, data);
  },

  async getById(req: Request, res: Response) {
    const data = await qualityService.getReport(readProjectId(req), String(req.params.reportId));
    return sendSuccess(res, data);
  },

  async create(req: Request, res: Response) {
    const data = await qualityService.createReport(readProjectId(req), readActor(req), req.body ?? {});
    res.status(201);
    return sendSuccess(res, data);
  },

  async update(req: Request, res: Response) {
    const data = await qualityService.updateReport(
      readProjectId(req),
      String(req.params.reportId),
      readActor(req),
      req.body ?? {}
    );
    return sendSuccess(res, data);
  },

  async sign(req: Request, res: Response) {
    const data = await qualityService.signReport(readProjectId(req), String(req.params.reportId), readActor(req));
    return sendSuccess(res, data);
  },
};

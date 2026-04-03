import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils";
import { warehouseService } from "./warehouse.service";
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

export const warehouseController = {
  async listInventory(req: Request, res: Response) {
    const data = await warehouseService.getInventory(readProjectId(req), readActor(req));
    return sendSuccess(res, data);
  },

  async getInventoryItem(req: Request, res: Response) {
    const data = await warehouseService.getInventoryItem(
      readProjectId(req),
      String(req.params.id),
      readActor(req)
    );
    return sendSuccess(res, data);
  },

  async listTransactions(req: Request, res: Response) {
    const data = await warehouseService.listTransactions(readProjectId(req), readActor(req));
    return sendSuccess(res, data);
  },

  async createTransaction(req: Request, res: Response) {
    const data = await warehouseService.createTransaction(readProjectId(req), readActor(req), req.body ?? {});
    res.status(201);
    return sendSuccess(res, data);
  },

  async createRequest(req: Request, res: Response) {
    const data = await warehouseService.createRequest(readProjectId(req), readActor(req), req.body ?? {});
    res.status(201);
    return sendSuccess(res, data);
  },

  async updateRequest(req: Request, res: Response) {
    const data = await warehouseService.updateRequest(
      readProjectId(req),
      String(req.params.id),
      readActor(req),
      req.body ?? {}
    );
    return sendSuccess(res, data);
  },
};

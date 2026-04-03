import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils";
import { permissionService as sharedPermissionService } from "../../shared/services/permission.service";
import { projectPermissionService } from "./permission.service";

function readProjectId(req: Request): string {
  return String(req.params.projectId ?? "");
}

export const permissionController = {
  async getProjectPermissions(req: Request, res: Response) {
    const projectId = readProjectId(req);
    const userId = req.user!.id;

    const permissions =
      req.userPermissions ?? (await sharedPermissionService.getUserProjectPermissions(userId, projectId));

    return sendSuccess(res, permissions);
  },

  async getProjectSettings(req: Request, res: Response) {
    const data = await projectPermissionService.getProjectSettings(readProjectId(req));
    return sendSuccess(res, data);
  },

  async getProjectPermissionMatrix(req: Request, res: Response) {
    const data = await projectPermissionService.getProjectPermissionMatrix(readProjectId(req));
    return sendSuccess(res, data);
  },

  async upsertToolPermissionOverride(req: Request, res: Response) {
    const data = await projectPermissionService.upsertToolPermissionOverride({
      projectId: readProjectId(req),
      userId: String(req.body?.userId ?? ""),
      toolId: String(req.body?.toolId ?? ""),
      level: String(req.body?.level ?? ""),
    });
    return sendSuccess(res, data);
  },

  async removeToolPermissionOverride(req: Request, res: Response) {
    const data = await projectPermissionService.removeToolPermissionOverride({
      projectId: readProjectId(req),
      userId: String(req.params.userId ?? ""),
      toolId: String(req.params.toolId ?? ""),
    });
    return sendSuccess(res, data);
  },

  async assignSpecialPrivilege(req: Request, res: Response) {
    const data = await projectPermissionService.assignSpecialPrivilege({
      projectId: readProjectId(req),
      userId: String(req.body?.userId ?? ""),
      privilege: String(req.body?.privilege ?? ""),
      grantedBy: req.user!.id,
    });
    return sendSuccess(res, data);
  },

  async revokeSpecialPrivilege(req: Request, res: Response) {
    const data = await projectPermissionService.revokeSpecialPrivilege({
      projectId: readProjectId(req),
      assignmentId: String(req.params.assignmentId ?? ""),
    });
    return sendSuccess(res, data);
  },
};

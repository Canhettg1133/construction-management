import type { NextFunction, Request, Response } from "express";
import { hasMinPermission, type PermissionLevel, type ToolId } from "@construction/shared";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors";
import { permissionService } from "../services/permission.service";

function readProjectId(req: Request): string | null {
  const projectId = req.params?.projectId;
  if (typeof projectId === "string" && projectId.length > 0) {
    return projectId;
  }
  return null;
}

export function requireProjectMembership(options?: { optional?: boolean }) {
  const optional = options?.optional ?? false;

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("Chưa đăng nhập");
      }

      const projectId = readProjectId(req);
      if (!projectId) {
        if (optional) {
          return next();
        }
        throw new BadRequestError("Thiếu projectId");
      }

      const membership = await permissionService.getProjectMembership(req.user.id, projectId);
      if (!membership) {
        throw new UnauthorizedError("Phiên đăng nhập không hợp lệ");
      }

      req.projectMembership = membership;

      if (!optional && !membership.isMember) {
        throw new ForbiddenError("Bạn không có quyền truy cập dự án này");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function loadUserPermissions(req: Request, _res: Response, next: NextFunction) {
  (async () => {
    if (!req.user?.id) {
      throw new UnauthorizedError("Chưa đăng nhập");
    }

    const projectId = readProjectId(req);
    if (!projectId) {
      return;
    }

    const permissions = await permissionService.getUserProjectPermissions(req.user.id, projectId);
    req.userPermissions = permissions;

    if (!req.projectMembership) {
      req.projectMembership = {
        projectId,
        userId: req.user.id,
        systemRole: permissions.systemRole,
        projectRole: permissions.projectRole,
        isSystemAdmin: permissions.systemRole === "ADMIN",
        isMember:
          permissions.systemRole === "ADMIN" ||
          permissions.projectRole !== null ||
          Object.values(permissions.toolPermissions).some((level) => level !== undefined && level !== "NONE"),
      };
    }
  })()
    .then(() => next())
    .catch(next);
}

export function requireToolPermission(toolId: ToolId, minLevel: PermissionLevel = "READ") {
  return (req: Request, _res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user?.id) {
        throw new UnauthorizedError("Chưa đăng nhập");
      }

      const projectId = readProjectId(req);
      if (!projectId) {
        throw new BadRequestError("Thiếu projectId");
      }

      if (!req.userPermissions) {
        req.userPermissions = await permissionService.getUserProjectPermissions(req.user.id, projectId);
      }

      const userLevel = req.userPermissions.toolPermissions[toolId] ?? "NONE";
      if (!hasMinPermission(userLevel, minLevel)) {
        throw new ForbiddenError(`Cần quyền ${minLevel} trên ${toolId}`);
      }
    })()
      .then(() => next())
      .catch(next);
  };
}

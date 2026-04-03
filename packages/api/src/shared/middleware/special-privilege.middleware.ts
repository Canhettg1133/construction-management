import type { NextFunction, Request, Response } from "express";
import type { SpecialPrivilege } from "@construction/shared";
import { BadRequestError, ForbiddenError, UnauthorizedError } from "../errors";
import { permissionService } from "../services/permission.service";

export function requireSpecialPrivilege(privilege: SpecialPrivilege) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (async () => {
      if (!req.user?.id) {
        throw new UnauthorizedError("Chưa đăng nhập");
      }

      const projectId = String(req.params?.projectId ?? "");
      if (!projectId) {
        throw new BadRequestError("Thiếu projectId");
      }

      const has = await permissionService.hasSpecialPrivilege(req.user.id, projectId, privilege);
      if (!has) {
        throw new ForbiddenError(`Cần quyền đặc biệt: ${privilege}`);
      }
    })()
      .then(() => next())
      .catch(next);
  };
}

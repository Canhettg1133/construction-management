import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { UnauthorizedError, ForbiddenError } from "../errors";
import type { UserRole } from "@construction/shared";

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;

  if (!token) {
    throw new UnauthorizedError("Chưa đăng nhập");
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    throw new UnauthorizedError("Phiên đăng nhập không hợp lệ");
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
}

import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import { logger } from "../../config/logger";

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...("details" in err && { details: (err as { details?: unknown }).details }),
      },
    });
  }

  // Prisma known errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as unknown as { code: string; meta?: Record<string, unknown> };
    logger.error({ code: prismaErr.code, meta: prismaErr.meta }, "Prisma error");

    if (prismaErr.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: { code: "CONFLICT", message: "Dữ liệu đã tồn tại, không thể tạo trùng lặp." },
      });
    }
    if (prismaErr.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Bản ghi không tồn tại hoặc đã bị xóa." },
      });
    }
  }

  logger.error(err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Đã có lỗi xảy ra",
    },
  });
}

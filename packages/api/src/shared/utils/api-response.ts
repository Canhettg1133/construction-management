import type { Response } from "express";
import type { PaginationMeta } from "@construction/shared";

export function sendSuccess<T>(res: Response, data: T, meta?: PaginationMeta) {
  return res.status(res.statusCode === 200 ? 200 : 201).json({
    success: true,
    data,
    ...(meta && { meta }),
  });
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>
) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
}

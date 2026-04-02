import type { Request, Response } from "express";
import { fileService } from "./file.service";
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from "../../shared/utils";
import fs from "fs";
import path from "path";
import { env } from "../../config/env";
import { NotFoundError } from "../../shared/errors";

export const fileController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { files, total } = await fileService.list(
      String(req.params.projectId), page, pageSize,
      req.query.file_type as string
    );
    return sendSuccess(res, files, buildPaginationMeta(total, page, pageSize));
  },

  async upload(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Chưa chọn file" } });
    }
    const file = await fileService.upload(String(req.params.projectId), req.user!.id, req.file);
    return sendSuccess(res, file);
  },

  async download(req: Request, res: Response) {
    const file = await fileService.getById(String(req.params.fileId));
    const fullPath = path.join(env.UPLOAD_DIR, file.filePath);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError("File không tồn tại trên disk");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.setHeader("Content-Type", file.mimeType);
    return res.sendFile(fullPath, { root: "." });
  },

  async delete(req: Request, res: Response) {
    await fileService.delete(String(req.params.fileId), req.user?.id);
    return sendNoContent(res);
  },
};

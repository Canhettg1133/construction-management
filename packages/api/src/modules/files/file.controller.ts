import type { Request, Response } from "express";
import { fileService } from "./file.service";
import { sendSuccess, sendNoContent, parsePagination, buildPaginationMeta } from "../../shared/utils";
import { NotFoundError } from "../../shared/errors";
import { resolveStoredFilePath } from "./file.utils";

export const fileController = {
  async list(req: Request, res: Response) {
    const { page, pageSize } = parsePagination(req.query);
    const { files, total } = await fileService.list(
      String(req.params.projectId),
      page,
      pageSize,
      req.query.file_type as string
    );
    return sendSuccess(res, files, buildPaginationMeta(total, page, pageSize));
  },

  async upload(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Chưa chọn tệp" } });
    }

    const folderId =
      typeof req.body.folder_id === "string" && req.body.folder_id.trim()
        ? req.body.folder_id.trim()
        : typeof req.body.folderId === "string" && req.body.folderId.trim()
        ? req.body.folderId.trim()
        : undefined;

    const tags = typeof req.body.tags === "string" ? req.body.tags : undefined;

    const file = await fileService.upload(String(req.params.projectId), req.user!.id, req.file, {
      folderId,
      tags,
    });
    return sendSuccess(res, file);
  },

  async view(req: Request, res: Response) {
    const file = await fileService.getById(String(req.params.fileId));
    const fullPath = resolveStoredFilePath(file.filePath, file.fileName);

    if (!fullPath) {
      throw new NotFoundError("File khong ton tai tren disk");
    }

    res.setHeader("Content-Type", file.mimeType);
    const encodedName = encodeURIComponent(file.originalName).replace(/['()]/g, escape).replace(/\*/g, "%2A");
    res.setHeader("Content-Disposition", `inline; filename="${file.originalName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.sendFile(fullPath);
  },

  async download(req: Request, res: Response) {
    const file = await fileService.getById(String(req.params.fileId));
    const fullPath = resolveStoredFilePath(file.filePath, file.fileName);

    if (!fullPath) {
      throw new NotFoundError("File khong ton tai tren disk");
    }

    const encodedName = encodeURIComponent(file.originalName).replace(/['()]/g, escape).replace(/\*/g, "%2A");
    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"; filename*=UTF-8''${encodedName}`);
    res.setHeader("Content-Type", file.mimeType);
    return res.sendFile(fullPath);
  },

  async delete(req: Request, res: Response) {
    await fileService.delete(String(req.params.fileId), req.user?.id);
    return sendNoContent(res);
  },
};

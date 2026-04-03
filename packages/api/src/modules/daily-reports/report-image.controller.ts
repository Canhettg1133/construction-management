import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { env } from "../../config/env";
import { reportImageRepository } from "./report-image.repository";
import { NotFoundError, ForbiddenError } from "../../shared/errors";
import { sendSuccess, sendNoContent } from "../../shared/utils";
import { reportRepository } from "./report.repository";

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
  };
  return map[mimeType] ?? ".jpg";
}

export const reportImageController = {
  async upload(req: Request, res: Response) {
    const { projectId, reportId } = req.params as { projectId: string; reportId: string };
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Không có file nào được upload" } });
    }

    const report = await reportRepository.findById(reportId);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    const images = [];
    for (const file of files) {
      const ext = getFileExtension(file.mimetype);
      const baseName = path.parse(file.filename).name;
      const fileName = `${baseName}${ext}`;
      const filePath = path.join("projects", projectId, "reports", reportId, "images", fileName);

      const image = await reportImageRepository.create({
        reportId,
        fileName,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath,
      });
      images.push(image);
    }

    return sendSuccess(res, images);
  },

  async list(req: Request, res: Response) {
    const images = await reportImageRepository.findByReport(String(req.params.reportId));
    return sendSuccess(res, images);
  },

  async view(req: Request, res: Response) {
    const { reportId, imageId } = req.params as { reportId: string; imageId: string };

    const image = await reportImageRepository.findById(imageId);
    if (!image || image.reportId !== reportId) {
      throw new NotFoundError("Khong tim thay anh");
    }

    const fullPath = path.resolve(env.UPLOAD_DIR, path.basename(image.fileName));
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundError("Anh khong ton tai tren disk");
    }

    res.setHeader("Content-Type", image.mimeType);
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.sendFile(fullPath);
  },

  async delete(req: Request, res: Response) {
    const { reportId, imageId } = req.params as { reportId: string; imageId: string };
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const image = await reportImageRepository.findById(imageId);
    if (!image) throw new NotFoundError("Không tìm thấy ảnh");
    if (image.reportId !== reportId) throw new NotFoundError("Ảnh không thuộc báo cáo này");

    const report = await reportRepository.findById(reportId);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
      if (report.createdBy !== userId) {
        throw new ForbiddenError("Bạn không có quyền xóa ảnh báo cáo này");
      }
    }

    await reportImageRepository.delete(imageId);
    return sendNoContent(res);
  },
};


import type { Request, Response } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid";
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
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Không có file nào được upload" } });
    }

    const report = await reportRepository.findById(reportId);
    if (!report) throw new NotFoundError("Không tìm thấy báo cáo");

    const images = [];
    for (const file of files) {
      const ext = getFileExtension(file.mimetype);
      const fileName = `${uuidv4()}${ext}`;
      const filePath = path.join("projects", projectId, "reports", reportId, "images", fileName);

      const image = await reportImageRepository.create({
        reportId,
        fileName,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath,
        uploadedBy: userId,
      });
      images.push(image);
    }

    return sendSuccess(res, images);
  },

  async list(req: Request, res: Response) {
    const images = await reportImageRepository.findByReport(String(req.params.reportId));
    return sendSuccess(res, images);
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

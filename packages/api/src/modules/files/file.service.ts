import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileRepository } from "./file.repository";
import { NotFoundError } from "../../shared/errors";
import { ALLOWED_FILE_TYPES, LIMITS } from "@construction/shared";
import { auditService } from "../audit/audit.service";
import { AuditEntityType } from "@prisma/client";

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.ms-excel": ".xls",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  };
  return map[mimeType] || "";
}

function detectFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "excel";
  if (mimeType.includes("word") || mimeType.includes("document")) return "document";
  return "other";
}

export const fileService = {
  async list(projectId: string, page: number, pageSize: number, fileType?: string) {
    const [files, total] = await Promise.all([
      fileRepository.findAll(projectId, page, pageSize, fileType),
      fileRepository.count(projectId, fileType),
    ]);
    return { files, total };
  },

  async upload(projectId: string, uploadedBy: string, file: Express.Multer.File) {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new Error("Loại file không được hỗ trợ");
    }
    if (file.size > LIMITS.MAX_FILE_SIZE) {
      throw new Error("File quá lớn (tối đa 10MB)");
    }

    const ext = getFileExtension(file.mimetype);
    const fileName = uuidv4() + ext;
    const filePath = path.join("projects", projectId, "files", fileName);

    const created = await fileRepository.create({
      projectId,
      uploadedBy,
      fileName,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath,
      fileType: detectFileType(file.mimetype),
    });

    await auditService.log({
      userId: uploadedBy,
      action: "CREATE",
      entityType: AuditEntityType.FILE,
      entityId: created.id,
      description: `Đã upload file: ${created.originalName}`,
    });

    return created;
  },

  async getById(id: string) {
    const file = await fileRepository.findById(id);
    if (!file) throw new NotFoundError("Không tìm thấy file");
    return file;
  },

  async delete(id: string, userId?: string) {
    const file = await fileRepository.findById(id);
    if (!file) throw new NotFoundError("Không tìm thấy file");

    const deleted = await fileRepository.delete(id);

    if (userId) {
      await auditService.log({
        userId,
        action: "DELETE",
        entityType: AuditEntityType.FILE,
        entityId: id,
        description: `Đã xóa file: ${file.originalName}`,
      });
    }

    return deleted;
  },
};

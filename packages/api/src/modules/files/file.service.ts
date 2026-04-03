import { v4 as uuidv4 } from "uuid";
import { fileRepository } from "./file.repository";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { ALLOWED_FILE_TYPES, LIMITS } from "@construction/shared";
import { auditService } from "../audit/audit.service";
import { AuditEntityType } from "@prisma/client";
import {
  buildProjectFileRelativePath,
  detectFileType,
  getFileExtension,
  moveUploadedFileToRelativePath,
} from "./file.utils";

function normalizeTags(rawTags?: string | null) {
  if (!rawTags) return null;
  const parts = rawTags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return Array.from(new Set(parts)).join(", ");
}

export const fileService = {
  async list(projectId: string, page: number, pageSize: number, fileType?: string) {
    const [files, total] = await Promise.all([
      fileRepository.findAll(projectId, page, pageSize, fileType),
      fileRepository.count(projectId, fileType),
    ]);
    return { files, total };
  },

  async upload(
    projectId: string,
    uploadedBy: string,
    file: Express.Multer.File,
    options?: { folderId?: string; tags?: string }
  ) {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestError("Loại tệp không được hỗ trợ");
    }
    if (file.size > LIMITS.MAX_FILE_SIZE) {
      throw new BadRequestError("Tệp vượt quá dung lượng tối đa 10MB");
    }

    let folderId: string | null = null;
    if (options?.folderId) {
      const folder = await fileRepository.findFolderById(options.folderId);
      if (!folder) {
        throw new BadRequestError("Thư mục không tồn tại");
      }
      if (folder.projectId !== projectId) {
        throw new BadRequestError("Thư mục không thuộc dự án");
      }
      folderId = folder.id;
    }

    const ext = getFileExtension(file.mimetype);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = buildProjectFileRelativePath(projectId, fileName);
    moveUploadedFileToRelativePath(file.path, filePath);

    const created = await fileRepository.create({
      projectId,
      uploadedBy,
      folderId,
      fileName,
      originalName: Buffer.from(file.originalname, "latin1").toString("utf8"),
      fileSize: file.size,
      mimeType: file.mimetype,
      filePath,
      fileType: detectFileType(file.mimetype),
      version: 1,
      parentVersionId: null,
      tags: normalizeTags(options?.tags),
    });

    await auditService.log({
      userId: uploadedBy,
      action: "CREATE",
      entityType: AuditEntityType.FILE,
      entityId: created.id,
      description: `Đã tải tệp lên: ${created.originalName}`,
    });

    return created;
  },

  async getById(id: string) {
    const file = await fileRepository.findById(id);
    if (!file) throw new NotFoundError("Không tìm thấy tệp");
    return file;
  },

  async delete(id: string, userId?: string) {
    const file = await fileRepository.findById(id);
    if (!file) throw new NotFoundError("Không tìm thấy tệp");

    const deleted = await fileRepository.delete(id);

    if (userId) {
      await auditService.log({
        userId,
        action: "DELETE",
        entityType: AuditEntityType.FILE,
        entityId: id,
        description: `Đã xóa tệp: ${file.originalName}`,
      });
    }

    return deleted;
  },
};

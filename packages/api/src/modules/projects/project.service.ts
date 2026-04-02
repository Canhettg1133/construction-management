import { projectRepository } from "./project.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";
import { auditService } from "../audit/audit.service";
import { AuditEntityType } from "@prisma/client";

export const projectService = {
  async list(page: number, pageSize: number, userId: string, userRole: string, status?: string, q?: string) {
    const isFullAccess = userRole === "ADMIN";
    const [projects, total] = await Promise.all([
      projectRepository.findAll(page, pageSize, isFullAccess ? undefined : userId, status, q),
      projectRepository.countAll(isFullAccess ? undefined : userId, status, q),
    ]);
    return { projects, total };
  },

  async getById(id: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError("Không tìm thấy dự án");
    return project;
  },

  async create(data: { code: string; name: string; location: string; startDate: Date; createdBy: string; description?: string; clientName?: string; endDate?: Date; status?: string }) {
    const existing = await projectRepository.findByCode(data.code);
    if (existing) throw new ConflictError("Mã dự án đã tồn tại");
    
    const project = await projectRepository.create(data);
    
    await auditService.log({
      userId: data.createdBy,
      action: "CREATE",
      entityType: AuditEntityType.PROJECT,
      entityId: project.id,
      description: `Đã tạo dự án mới: ${project.name} (${project.code})`,
    });

    return project;
  },

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError("Không tìm thấy dự án");
    
    const updated = await projectRepository.update(id, data);

    await auditService.log({
      userId,
      action: "UPDATE",
      entityType: AuditEntityType.PROJECT,
      entityId: id,
      description: `Đã cập nhật thông tin dự án: ${updated.name}`,
    });

    return updated;
  },
};

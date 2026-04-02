import * as bcrypt from "@node-rs/bcrypt";
import { userRepository } from "./user.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";
import { auditService } from "../audit/audit.service";
import { AuditEntityType } from "@prisma/client";

export const userService = {
  async list(page: number, pageSize: number, role?: string, q?: string) {
    const [users, total] = await Promise.all([
      userRepository.findAll(page, pageSize, role, q),
      userRepository.countAll(role, q),
    ]);
    return { users, total };
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("Không tìm thấy user");
    return user;
  },

  async create(data: { name: string; email: string; password: string; role: string; phone?: string; createdBy?: string }) {
    const existing = await userRepository.findByEmail(data.email.toLowerCase());
    if (existing) throw new ConflictError("Email đã tồn tại");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const created = await userRepository.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      phone: data.phone,
    });

    if (data.createdBy) {
      await auditService.log({
        userId: data.createdBy,
        action: "CREATE",
        entityType: AuditEntityType.USER,
        entityId: created.id,
        description: `Đã tạo người dùng: ${created.email}`,
      });
    }

    return created;
  },

  async update(id: string, data: { name?: string; role?: string; phone?: string }, updatedBy?: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("Không tìm thấy user");

    const updated = await userRepository.update(id, data);

    if (updatedBy) {
      await auditService.log({
        userId: updatedBy,
        action: "UPDATE",
        entityType: AuditEntityType.USER,
        entityId: id,
        description: `Đã cập nhật người dùng: ${updated.email}`,
      });
    }

    return updated;
  },

  async toggleStatus(id: string, isActive: boolean, updatedBy?: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("Không tìm thấy user");

    const updated = await userRepository.toggleStatus(id, isActive);

    if (updatedBy) {
      await auditService.log({
        userId: updatedBy,
        action: "STATUS_CHANGE",
        entityType: AuditEntityType.USER,
        entityId: id,
        description: `Đã ${isActive ? "mở khóa" : "khóa"} người dùng: ${updated.email}`,
      });
    }

    return updated;
  },
};

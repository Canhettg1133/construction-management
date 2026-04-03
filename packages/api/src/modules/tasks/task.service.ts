import { taskRepository } from "./task.repository";
import { NotFoundError, ForbiddenError } from "../../shared/errors";
import { auditService } from "../audit/audit.service";
import { notificationTriggers } from "../notifications/notification.triggers";
import { AuditEntityType } from "@prisma/client";

export const taskService = {
  async list(projectId: string, page: number, pageSize: number, status?: string, priority?: string, assignedTo?: string) {
    const [tasks, total] = await Promise.all([
      taskRepository.findAll(projectId, page, pageSize, status, priority, assignedTo),
      taskRepository.count(projectId, status, priority, assignedTo),
    ]);
    return { tasks, total };
  },

  async getById(id: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError("Không tìm thấy task");
    return task;
  },

  async create(data: { projectId: string; title: string; createdBy: string; description?: string; assignedTo?: string; reportId?: string; priority?: string; dueDate?: Date; requiresApproval?: boolean }) {
    const task = await taskRepository.create({
      ...data,
      requiresApproval: data.requiresApproval ?? false,
    });

    await auditService.log({
      userId: data.createdBy,
      action: "CREATE",
      entityType: AuditEntityType.TASK,
      entityId: task.id,
      description: `Đã tạo task mới: ${task.title}`,
    });

    // Notify assignee
    if (data.assignedTo) {
      try {
        await notificationTriggers.taskAssigned({
          assigneeId: data.assignedTo,
          taskId: task.id,
          taskTitle: task.title,
          projectId: data.projectId,
        });
      } catch {
      }
    }

    return task;
  },

  async update(id: string, data: Record<string, unknown>, userId: string, userRole: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError("Không tìm thấy task");

    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
      if (task.createdBy !== userId && task.assignedTo !== userId) {
        throw new ForbiddenError("Bạn không có quyền sửa task này");
      }
    }

    const updated = await taskRepository.update(id, data);

    await auditService.log({
      userId,
      action: "UPDATE",
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã cập nhật thông tin task: ${updated.title}`,
    });

    return updated;
  },

  async updateStatus(id: string, status: string, userId: string, userRole: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError("Không tìm thấy task");

    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER") {
      if (task.assignedTo !== userId) {
        throw new ForbiddenError("Bạn không có quyền cập nhật trạng thái task này");
      }
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "DONE") {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    const updated = await taskRepository.update(id, updateData);

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã đổi trạng thái task "${updated.title}" sang ${status}`,
    });

    return updated;
  },

  async delete(id: string, userId: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError("Không tìm thấy task");

    await taskRepository.delete(id);

    await auditService.log({
      userId,
      action: "DELETE",
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã xóa task: ${task.title}`,
    });
  },

  async submitForApproval(id: string, userId: string, userRole: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError("Không tìm thấy task");

    const canSubmit =
      userRole === "ADMIN" ||
      userRole === "PROJECT_MANAGER" ||
      userRole === "SITE_ENGINEER";

    if (!canSubmit) throw new ForbiddenError("Bạn không có quyền gửi duyệt task này");
    if (!task.requiresApproval) throw new ForbiddenError("Task này không yêu cầu duyệt");
    if (task.approvalStatus !== "PENDING") throw new ForbiddenError("Task đã được xử lý");

    const updated = await taskRepository.update(id, {
      submittedAt: new Date(),
      approvalStatus: "PENDING",
    });

    await auditService.log({
      userId,
      action: "STATUS_CHANGE",
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã gửi duyệt task: ${task.title}`,
    });

    // Notify PMs of the project
    const pmIds = await taskRepository.getProjectPmIds(task.projectId);
    if (pmIds.length > 0) {
      await notificationTriggers.taskSubmitted({
        pmIds,
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
      });
    }

    return updated;
  },
};

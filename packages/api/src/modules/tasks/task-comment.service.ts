import { taskCommentRepository } from "./task-comment.repository";
import { NotFoundError, ForbiddenError } from "../../shared/errors";
import { taskRepository } from "./task.repository";
import { auditService } from "../audit/audit.service";
import { AuditEntityType } from "@prisma/client";

export const taskCommentService = {
  async list(taskId: string) {
    return taskCommentRepository.findByTask(taskId);
  },

  async create(taskId: string, authorId: string, content: string) {
    const task = await taskRepository.findById(taskId);
    if (!task) throw new NotFoundError("Không tìm thấy task");

    const comment = await taskCommentRepository.create({ taskId, authorId, content });

    await auditService.log({
      userId: authorId,
      action: "CREATE",
      entityType: AuditEntityType.TASK,
      entityId: taskId,
      description: `Đã bình luận trên task "${task.title}"`,
    });

    return comment;
  },

  async update(commentId: string, authorId: string, content: string) {
    const comment = await taskCommentRepository.findById(commentId);
    if (!comment) throw new NotFoundError("Không tìm thấy bình luận");
    if (comment.authorId !== authorId) throw new ForbiddenError("Bạn chỉ có thể sửa bình luận của mình");

    const updated = await taskCommentRepository.update(commentId, content);

    await auditService.log({
      userId: authorId,
      action: "UPDATE",
      entityType: AuditEntityType.TASK,
      entityId: comment.taskId,
      description: `Đã sửa bình luận trên task`,
    });

    return updated;
  },

  async delete(commentId: string, userId: string, userRole: string) {
    const comment = await taskCommentRepository.findById(commentId);
    if (!comment) throw new NotFoundError("Không tìm thấy bình luận");

    if (userRole !== "ADMIN" && userRole !== "PROJECT_MANAGER" && comment.authorId !== userId) {
      throw new ForbiddenError("Bạn không có quyền xóa bình luận này");
    }

    await taskCommentRepository.delete(commentId);

    await auditService.log({
      userId,
      action: "DELETE",
      entityType: AuditEntityType.TASK,
      entityId: comment.taskId,
      description: `Đã xóa bình luận trên task`,
    });
  },
};

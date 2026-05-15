import { taskCommentRepository } from './task-comment.repository'
import { NotFoundError, ForbiddenError } from '../../shared/errors'
import { taskRepository } from './task.repository'
import { auditService } from '../audit/audit.service'
import { AuditEntityType } from '@prisma/client'

export const taskCommentService = {
  async list(projectId: string, taskId: string) {
    const task = await taskRepository.findByProjectId(projectId, taskId)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')
    return taskCommentRepository.findByTask(taskId)
  },

  async create(projectId: string, taskId: string, authorId: string, content: string) {
    const task = await taskRepository.findByProjectId(projectId, taskId)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    const comment = await taskCommentRepository.create({ taskId, authorId, content })

    await auditService.log({
      userId: authorId,
      action: 'CREATE',
      entityType: AuditEntityType.TASK,
      entityId: taskId,
      description: `Đã bình luận trên công việc "${task.title}"`,
    })

    return comment
  },

  async update(projectId: string, taskId: string, commentId: string, authorId: string, content: string) {
    const task = await taskRepository.findByProjectId(projectId, taskId)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    const comment = await taskCommentRepository.findById(commentId)
    if (!comment || comment.taskId !== taskId) throw new NotFoundError('Không tìm thấy bình luận')
    if (comment.authorId !== authorId) throw new ForbiddenError('Bạn chỉ có thể sửa bình luận của mình')

    const updated = await taskCommentRepository.update(commentId, content)

    await auditService.log({
      userId: authorId,
      action: 'UPDATE',
      entityType: AuditEntityType.TASK,
      entityId: comment.taskId,
      description: 'Đã sửa bình luận trên công việc',
    })

    return updated
  },

  async delete(projectId: string, taskId: string, commentId: string, userId: string) {
    const task = await taskRepository.findByProjectId(projectId, taskId)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    const comment = await taskCommentRepository.findById(commentId)
    if (!comment || comment.taskId !== taskId) throw new NotFoundError('Không tìm thấy bình luận')

    await taskCommentRepository.delete(commentId)

    await auditService.log({
      userId,
      action: 'DELETE',
      entityType: AuditEntityType.TASK,
      entityId: comment.taskId,
      description: 'Đã xóa bình luận trên công việc',
    })
  },
}

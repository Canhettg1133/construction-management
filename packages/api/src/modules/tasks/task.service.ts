import { taskRepository } from './task.repository'
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors'
import { auditService } from '../audit/audit.service'
import { notificationTriggers } from '../notifications/notification.triggers'
import { AuditEntityType } from '@prisma/client'
import { permissionService } from '../../shared/services/permission.service'

export const taskService = {
  async list(
    projectId: string,
    page: number,
    pageSize: number,
    status?: string,
    priority?: string,
    assignedTo?: string,
    from?: string,
    to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined
    const [tasks, total] = await Promise.all([
      taskRepository.findAll(projectId, page, pageSize, status, priority, assignedTo, fromDate, toDate),
      taskRepository.count(projectId, status, priority, assignedTo, fromDate, toDate),
    ])
    return { tasks, total }
  },

  async getById(projectId: string, id: string) {
    const task = await taskRepository.findByProjectId(projectId, id)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')
    return task
  },

  async create(data: {
    projectId: string
    title: string
    createdBy: string
    description?: string
    assignedTo?: string
    reportId?: string
    priority?: string
    dueDate?: Date
    requiresApproval?: boolean
  }) {
    const task = await taskRepository.create({
      ...data,
      requiresApproval: data.requiresApproval ?? false,
    })

    await auditService.log({
      userId: data.createdBy,
      action: 'CREATE',
      entityType: AuditEntityType.TASK,
      entityId: task.id,
      description: `Đã tạo công việc mới: ${task.title}`,
    })

    // Notify assignee
    if (data.assignedTo) {
      try {
        await notificationTriggers.taskAssigned({
          assigneeId: data.assignedTo,
          taskId: task.id,
          taskTitle: task.title,
          projectId: data.projectId,
        })
      } catch {}
    }

    return task
  },

  async update(projectId: string, id: string, data: Record<string, unknown>, userId: string) {
    const task = await taskRepository.findByProjectId(projectId, id)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    const canManageTask = await permissionService.hasPermission(userId, projectId, 'TASK', 'ADMIN')
    if (!canManageTask && task.createdBy !== userId && task.assignedTo !== userId) {
      throw new ForbiddenError('Bạn không có quyền sửa công việc này')
    }

    if (task.approvalStatus === 'REJECTED') {
      data.approvalStatus = 'PENDING'
      data.submittedAt = null
      data.approvedBy = null
      data.approvedAt = null
      data.rejectedReason = null
    }

    const updated = await taskRepository.update(id, data)

    await auditService.log({
      userId,
      action: 'UPDATE',
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã cập nhật thông tin công việc: ${updated.title}`,
    })

    return updated
  },

  async updateStatus(projectId: string, id: string, status: string, userId: string) {
    const task = await taskRepository.findByProjectId(projectId, id)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    const canManageTask = await permissionService.hasPermission(userId, projectId, 'TASK', 'ADMIN')
    if (!canManageTask && task.assignedTo !== userId) {
      throw new ForbiddenError('Bạn không có quyền cập nhật trạng thái công việc này')
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'DONE') {
      if (task.requiresApproval && task.approvalStatus !== 'APPROVED') {
        throw new ForbiddenError('Công việc cần được duyệt trước khi hoàn thành')
      }
      updateData.completedAt = new Date()
    } else {
      updateData.completedAt = null
    }

    const updated = await taskRepository.update(id, updateData)

    await auditService.log({
      userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã đổi trạng thái công việc "${updated.title}" sang ${status}`,
    })

    return updated
  },

  async delete(projectId: string, id: string, userId: string) {
    const task = await taskRepository.findByProjectId(projectId, id)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    await taskRepository.delete(id)

    await auditService.log({
      userId,
      action: 'DELETE',
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã xóa công việc: ${task.title}`,
    })
  },

  async submitForApproval(projectId: string, id: string, userId: string) {
    const task = await taskRepository.findByProjectId(projectId, id)
    if (!task) throw new NotFoundError('Không tìm thấy công việc')

    if (task.assignedTo !== userId) throw new ForbiddenError('Chỉ người được giao mới được nộp duyệt')
    if (!task.requiresApproval) throw new ForbiddenError('Công việc này không yêu cầu duyệt')
    if (task.approvalStatus !== 'PENDING') throw new ForbiddenError('Công việc đã được xử lý')

    if (task.submittedAt) throw new BadRequestError('Công việc đã được gửi duyệt')

    const updated = await taskRepository.update(id, {
      submittedAt: new Date(),
      approvalStatus: 'PENDING',
    })

    await auditService.log({
      userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.TASK,
      entityId: id,
      description: `Đã gửi duyệt công việc: ${task.title}`,
    })

    // Notify PMs of the project
    const pmIds = await taskRepository.getProjectPmIds(task.projectId)
    if (pmIds.length > 0) {
      await notificationTriggers.taskSubmitted({
        pmIds,
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
      })
    }

    return updated
  },
}

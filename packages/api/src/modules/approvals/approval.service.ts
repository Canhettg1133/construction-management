import { prisma } from '../../config/database'
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error'
import { auditService } from '../audit/audit.service'
import { notificationTriggers } from '../notifications/notification.triggers'
import { AuditEntityType } from '@prisma/client'
import { permissionService } from '../../shared/services/permission.service'

export type ApprovalListType = 'reports' | 'tasks'

function assertReportAwaitingApproval(report: { approvalStatus: string; status: string; submittedAt: Date | null }) {
  if (report.approvalStatus !== 'PENDING' || report.status !== 'SENT' || !report.submittedAt) {
    throw new BadRequestError('Báo cáo chưa được gửi duyệt')
  }
}

function assertTaskAwaitingApproval(task: {
  approvalStatus: string
  requiresApproval: boolean
  submittedAt: Date | null
}) {
  if (task.approvalStatus !== 'PENDING' || !task.requiresApproval || !task.submittedAt) {
    throw new BadRequestError('Công việc chưa được gửi duyệt')
  }
}

export const approvalService = {
  async listPending(
    userId: string,
    userSystemRole: string,
    page: number,
    pageSize: number,
    type: ApprovalListType = 'reports',
  ) {
    const skip = (page - 1) * pageSize
    const projectFilter: Record<string, unknown> = {}

    if (userSystemRole !== 'ADMIN') {
      const memberProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true },
      })
      projectFilter.projectId = { in: memberProjects.map((m) => m.projectId) }
    }

    const reportWhere = {
      ...projectFilter,
      approvalStatus: 'PENDING',
      status: 'SENT',
      submittedAt: { not: null },
    }
    const taskWhere = {
      ...projectFilter,
      approvalStatus: 'PENDING',
      requiresApproval: true,
      submittedAt: { not: null },
    }

    const [totalReports, totalTasks] = await Promise.all([
      prisma.dailyReport.count({ where: reportWhere as any }),
      prisma.task.count({ where: taskWhere as any }),
    ])

    const reports =
      type === 'reports'
        ? await prisma.dailyReport.findMany({
            where: reportWhere as any,
            include: { project: true, creator: true },
            orderBy: { submittedAt: 'desc' },
            skip,
            take: pageSize,
          })
        : []

    const tasks =
      type === 'tasks'
        ? await prisma.task.findMany({
            where: taskWhere as any,
            include: { project: true, creator: true, assignee: true },
            orderBy: { submittedAt: 'desc' },
            skip,
            take: pageSize,
          })
        : []

    return { reports, tasks, totalReports, totalTasks, type }
  },

  async approveReport(reportId: string, userId: string) {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { project: { include: { members: true } } },
    })
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')
    assertReportAwaitingApproval(report)

    const isApprover = await permissionService.hasPermission(userId, report.projectId, 'PROJECT', 'ADMIN')
    if (!isApprover) throw new ForbiddenError('Bạn không có quyền duyệt báo cáo này')
    const hasQualitySigner = await permissionService.hasSpecialPrivilege(userId, report.projectId, 'QUALITY_SIGNER')
    if (!hasQualitySigner) throw new ForbiddenError('Cần quyền đặc biệt: QUALITY_SIGNER')

    const updated = await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    })

    const currentProjectProgress = Number(report.project.progress ?? 0)
    const approvedReportProgress = Number(report.progress ?? 0)
    const nextProjectProgress = Math.max(currentProjectProgress, approvedReportProgress)
    if (nextProjectProgress !== currentProjectProgress) {
      await prisma.project.update({
        where: { id: report.projectId },
        data: { progress: nextProjectProgress },
      })
    }

    await auditService.log({
      userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: reportId,
      description: `Đã duyệt báo cáo ngày ${report.reportDate.toLocaleDateString('vi-VN')}`,
    })

    await notificationTriggers.reportApproved({
      creatorId: report.createdBy,
      reportId: report.id,
      reportDate: report.reportDate,
      projectId: report.projectId,
    })

    return updated
  },

  async rejectReport(reportId: string, userId: string, reason: string) {
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { project: { include: { members: true } } },
    })
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')
    assertReportAwaitingApproval(report)

    const isApprover = await permissionService.hasPermission(userId, report.projectId, 'PROJECT', 'ADMIN')
    if (!isApprover) throw new ForbiddenError('Bạn không có quyền duyệt báo cáo này')
    const hasQualitySigner = await permissionService.hasSpecialPrivilege(userId, report.projectId, 'QUALITY_SIGNER')
    if (!hasQualitySigner) throw new ForbiddenError('Cần quyền đặc biệt: QUALITY_SIGNER')

    const updated = await prisma.dailyReport.update({
      where: { id: reportId },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    })

    await auditService.log({
      userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: reportId,
      description: `Đã từ chối báo cáo ngày ${report.reportDate.toLocaleDateString('vi-VN')}: ${reason}`,
    })

    await notificationTriggers.reportRejected({
      creatorId: report.createdBy,
      reportId: report.id,
      reportDate: report.reportDate,
      reason,
      projectId: report.projectId,
    })

    return updated
  },

  async approveTask(taskId: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    })
    if (!task) throw new NotFoundError('Không tìm thấy công việc')
    assertTaskAwaitingApproval(task)

    const isApprover = await permissionService.hasPermission(userId, task.projectId, 'PROJECT', 'ADMIN')
    if (!isApprover) throw new ForbiddenError('Bạn không có quyền duyệt công việc này')
    const hasQualitySigner = await permissionService.hasSpecialPrivilege(userId, task.projectId, 'QUALITY_SIGNER')
    if (!hasQualitySigner) throw new ForbiddenError('Cần quyền đặc biệt: QUALITY_SIGNER')

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    })

    await auditService.log({
      userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.TASK,
      entityId: taskId,
      description: `Đã duyệt công việc: ${task.title}`,
    })

    await notificationTriggers.taskApproved({
      creatorId: task.createdBy,
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
    })

    return updated
  },

  async rejectTask(taskId: string, userId: string, reason: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { members: true } } },
    })
    if (!task) throw new NotFoundError('Không tìm thấy công việc')
    assertTaskAwaitingApproval(task)

    const isApprover = await permissionService.hasPermission(userId, task.projectId, 'PROJECT', 'ADMIN')
    if (!isApprover) throw new ForbiddenError('Bạn không có quyền từ chối công việc này')
    const hasQualitySigner = await permissionService.hasSpecialPrivilege(userId, task.projectId, 'QUALITY_SIGNER')
    if (!hasQualitySigner) throw new ForbiddenError('Cần quyền đặc biệt: QUALITY_SIGNER')

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
        rejectedReason: reason,
      },
    })

    await auditService.log({
      userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.TASK,
      entityId: taskId,
      description: `Đã từ chối công việc: ${task.title} - ${reason}`,
    })

    await notificationTriggers.taskRejected({
      creatorId: task.createdBy,
      taskId: task.id,
      taskTitle: task.title,
      reason,
      projectId: task.projectId,
    })

    return updated
  },
}

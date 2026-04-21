import { reportRepository } from './report.repository'
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '../../shared/errors'
import type { ProjectRole, SystemRole } from '@construction/shared'
import { auditService } from '../audit/audit.service'
import { taskRepository } from '../tasks/task.repository'
import { notificationTriggers } from '../notifications/notification.triggers'
import { AuditEntityType } from '@prisma/client'

interface ReportActorContext {
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
}

function canManageAnyReport(actor: ReportActorContext): boolean {
  return actor.systemRole === 'ADMIN' || actor.projectRole === 'PROJECT_MANAGER'
}

function canChangeReport(report: { createdBy: string }, actor: ReportActorContext): boolean {
  return report.createdBy === actor.userId || canManageAnyReport(actor)
}

function parseReopenReason(value: unknown): string {
  const reason = String(value ?? '').trim()
  if (!reason) {
    throw new BadRequestError('Lý do mở lại báo cáo không được để trống')
  }
  if (reason.length > 2000) {
    throw new BadRequestError('Lý do mở lại báo cáo vượt quá 2000 ký tự')
  }
  return reason
}

export const reportService = {
  async list(projectId: string, page: number, pageSize: number, from?: string, to?: string, createdBy?: string) {
    const fromDate = from ? new Date(from) : undefined
    const toDate = to ? new Date(to) : undefined
    const [reports, total] = await Promise.all([
      reportRepository.findAll(projectId, page, pageSize, fromDate, toDate, createdBy),
      reportRepository.count(projectId, fromDate, toDate, createdBy),
    ])
    return { reports, total }
  },

  async getById(id: string) {
    const report = await reportRepository.findById(id)
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')
    return report
  },

  async create(data: {
    projectId: string
    createdBy: string
    reportDate: Date
    weather: string
    workerCount: number
    workDescription: string
    progress: number
    temperatureMin?: number
    temperatureMax?: number
    issues?: string
    notes?: string
    isDraft?: boolean
    tasks?: Array<{ title: string; description?: string; assignedTo?: string; priority?: string; dueDate?: Date }>
  }) {
    const existing = await reportRepository.findByProjectAndDate(data.projectId, data.reportDate)
    if (existing) throw new ConflictError('Bao cao cho ngay nay da ton tai')

    const previousReport = await reportRepository.findLatestBeforeDate(data.projectId, data.reportDate)
    if (previousReport && data.progress < Number(previousReport.progress)) {
      throw new BadRequestError(
        `Tien do bao cao phai >= ${previousReport.progress}% (bao cao ngay ${previousReport.reportDate.toLocaleDateString('vi-VN')})`,
      )
    }

    const nextReport = await reportRepository.findEarliestAfterDate(data.projectId, data.reportDate)
    if (nextReport && data.progress > Number(nextReport.progress)) {
      throw new BadRequestError(
        `Tien do bao cao phai <= ${nextReport.progress}% (bao cao ngay ${nextReport.reportDate.toLocaleDateString('vi-VN')})`,
      )
    }

    const { tasks, isDraft, ...reportData } = data
    const report = await reportRepository.create({
      ...reportData,
      status: isDraft ? 'DRAFT' : 'SENT',
    })

    if (!isDraft) {
      await auditService.log({
        userId: data.createdBy,
        action: 'CREATE',
        entityType: AuditEntityType.DAILY_REPORT,
        entityId: report.id,
        description: `Đã tạo và gửi báo cáo ngày ${data.reportDate.toLocaleDateString('vi-VN')}`,
      })
    }

    if (tasks && tasks.length > 0) {
      for (const taskData of tasks) {
        await taskRepository.create({
          ...taskData,
          projectId: data.projectId,
          createdBy: data.createdBy,
          reportId: report.id,
        })
      }
    }

    return report
  },

  async update(id: string, data: Record<string, unknown>, actor: ReportActorContext) {
    const report = await reportRepository.findById(id)
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')

    if (!canChangeReport(report, actor)) {
      throw new ForbiddenError('Bạn không có quyền sửa báo cáo này')
    }

    if (report.approvalStatus === 'APPROVED') {
      throw new BadRequestError('Báo cáo đã được duyệt, không thể chỉnh sửa trực tiếp')
    }

    if (typeof data.progress === 'number') {
      const previousReport = await reportRepository.findLatestBeforeDate(report.projectId, report.reportDate, id)
      if (previousReport && data.progress < Number(previousReport.progress)) {
        throw new BadRequestError(
          `Tien do bao cao phai >= ${previousReport.progress}% (bao cao ngay ${previousReport.reportDate.toLocaleDateString('vi-VN')})`,
        )
      }

      const nextReport = await reportRepository.findEarliestAfterDate(report.projectId, report.reportDate, id)
      if (nextReport && data.progress > Number(nextReport.progress)) {
        throw new BadRequestError(
          `Tien do bao cao phai <= ${nextReport.progress}% (bao cao ngay ${nextReport.reportDate.toLocaleDateString('vi-VN')})`,
        )
      }
    }

    if (report.approvalStatus === 'REJECTED') {
      data.approvalStatus = 'PENDING'
      data.rejectedReason = null
    }

    const updated = await reportRepository.update(id, data)

    await auditService.log({
      userId: actor.userId,
      action: 'UPDATE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã cập nhật báo cáo ngày ${updated.reportDate.toLocaleDateString('vi-VN')}`,
    })

    return updated
  },

  async updateStatus(id: string, status: string, actor: ReportActorContext) {
    const report = await reportRepository.findById(id)
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')

    if (!canChangeReport(report, actor)) {
      throw new ForbiddenError('Bạn không có quyền đổi trạng thái báo cáo này')
    }

    if (report.approvalStatus === 'APPROVED') {
      throw new BadRequestError('Báo cáo đã được duyệt, không thể đổi trạng thái trực tiếp')
    }

    const updated = await reportRepository.update(id, { status })

    await auditService.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã đổi trạng thái báo cáo ngày ${updated.reportDate.toLocaleDateString('vi-VN')} sang ${status === 'SENT' ? 'Đã gửi' : 'Nháp'}`,
    })

    return updated
  },

  async submitForApproval(id: string, actor: ReportActorContext) {
    const report = await reportRepository.findById(id)
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')

    if (!canChangeReport(report, actor)) throw new ForbiddenError('Bạn không có quyền nộp duyệt báo cáo này')
    if (report.approvalStatus === 'APPROVED') {
      throw new ForbiddenError('Báo cáo đã được duyệt, không thể nộp duyệt lại trực tiếp')
    }

    const updated = await reportRepository.update(id, {
      submittedAt: new Date(),
      approvalStatus: 'PENDING',
      status: 'SENT',
      rejectedReason: null,
    })

    await auditService.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã gửi duyệt báo cáo ngày ${report.reportDate.toLocaleDateString('vi-VN')}`,
    })

    // Notify PMs of the project
    const pmIds = await reportRepository.getProjectPmIds(report.projectId)
    if (pmIds.length > 0) {
      await notificationTriggers.reportSubmitted({
        pmIds,
        reportId: report.id,
        reportDate: report.reportDate,
        projectId: report.projectId,
      })
    }

    return updated
  },

  async reopen(id: string, actor: ReportActorContext, payload: Record<string, unknown>) {
    const report = await reportRepository.findById(id)
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')

    if (!canManageAnyReport(actor)) {
      throw new ForbiddenError('Chỉ Admin hoặc PM được mở lại báo cáo đã duyệt')
    }

    if (report.approvalStatus !== 'APPROVED') {
      throw new BadRequestError('Chỉ báo cáo đã duyệt mới cần mở lại')
    }

    const reason = parseReopenReason(payload.reason)
    const updated = await reportRepository.update(id, {
      approvalStatus: 'PENDING',
      approvedBy: null,
      approvedAt: null,
      status: 'SENT',
    })

    await auditService.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã mở lại báo cáo ngày ${report.reportDate.toLocaleDateString('vi-VN')}. Lý do: ${reason}`,
    })

    return updated
  },

  async delete(id: string, userId: string) {
    const report = await reportRepository.findById(id)
    if (!report) throw new NotFoundError('Không tìm thấy báo cáo')

    await reportRepository.delete(id)

    await auditService.log({
      userId,
      action: 'DELETE',
      entityType: AuditEntityType.DAILY_REPORT,
      entityId: id,
      description: `Đã xóa báo cáo ngày ${report.reportDate.toLocaleDateString('vi-VN')}`,
    })
  },
}

import { prisma } from '../../config/database'
import { AuditEntityType, Prisma } from '@prisma/client'
import type { ProjectRole, SystemRole } from '@construction/shared'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors'
import { notificationTriggers } from '../notifications/notification.triggers'
import { auditService } from '../audit/audit.service'

interface QualityActorContext {
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
}

function parseReportDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError('Ngày báo cáo không hợp lệ')
  }
  return date
}

function parseTextField(value: unknown, fieldName: string, maxLength: number): string {
  const text = String(value ?? '').trim()
  if (!text) {
    throw new BadRequestError(`${fieldName} không được để trống`)
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vượt quá ${maxLength} ký tự`)
  }
  return text
}

function parseSeverity(value: unknown): string {
  const allowed = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const s = String(value ?? 'MEDIUM').toUpperCase()
  if (!allowed.includes(s)) {
    throw new BadRequestError(`Mức độ nghiêm trọng phải là: ${allowed.join(' | ')}`)
  }
  return s
}

function parsePunchListStatus(value: unknown): string {
  const allowed = ['OPEN', 'FIXED', 'ACCEPTED', 'REJECTED']
  const s = String(value ?? 'OPEN').toUpperCase()
  if (!allowed.includes(s)) {
    throw new BadRequestError(`Trạng thái punch list phải là: ${allowed.join(' | ')}`)
  }
  return s
}

function parseResult(value: unknown): string {
  const allowed = ['PASS', 'FAIL', 'CONDITIONAL']
  const s = String(value ?? '').toUpperCase()
  if (s && !allowed.includes(s)) {
    throw new BadRequestError(`Kết quả phải là: ${allowed.join(' | ')}`)
  }
  return s
}

async function ensureProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  if (!project) {
    throw new NotFoundError('Không tìm thấy dự án')
  }

  return project
}

async function ensureReportInProject(projectId: string, reportId: string) {
  const report = await prisma.qualityReport.findFirst({
    where: { id: reportId, projectId },
    select: { id: true, inspectorId: true, status: true },
  })

  if (!report) {
    throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
  }

  return report
}

async function ensureInspector(projectId: string, inspectorId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: inspectorId } },
    select: { userId: true },
  })

  if (!member) {
    throw new BadRequestError('Người lập báo cáo không thuộc dự án')
  }
}

function canManageAnyReport(actor: QualityActorContext): boolean {
  return actor.systemRole === 'ADMIN' || actor.projectRole === 'PROJECT_MANAGER'
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

export const qualityService = {
  async listReports(projectId: string) {
    await ensureProjectExists(projectId)

    const reports = await prisma.qualityReport.findMany({
      where: { projectId },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        punchListItems: true,
        photos: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    })

    const summary = reports.reduce(
      (acc, report) => {
        acc.total += 1
        if (report.status === 'PENDING') acc.pending += 1
        if (report.status === 'APPROVED') acc.approved += 1
        if (report.status === 'REJECTED') acc.rejected += 1
        return acc
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 },
    )

    const passRate = summary.total > 0 ? Number(((summary.approved / summary.total) * 100).toFixed(2)) : 0

    return { projectId, summary: { ...summary, passRate }, reports }
  },

  async getReport(projectId: string, reportId: string) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        punchListItems: { orderBy: { createdAt: 'asc' } },
        photos: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
    }

    return report
  },

  async createReport(projectId: string, actor: QualityActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    const reportDate = parseReportDate(payload.reportDate)
    const location = parseTextField(payload.location, 'Vị trí', 500)
    const description = parseTextField(payload.description, 'Nội dung', 20000)
    const result = parseResult(payload.result)
    const notes = payload.notes !== undefined ? String(payload.notes).trim() || null : null
    const inspectorId = String(payload.inspectorId ?? actor.userId)

    if (!canManageAnyReport(actor) && inspectorId !== actor.userId) {
      throw new ForbiddenError('Bạn chỉ được tạo báo cáo chất lượng của chính mình')
    }

    await ensureInspector(projectId, inspectorId)

    return prisma.qualityReport.create({
      data: {
        projectId,
        reportDate,
        inspectorId,
        location,
        description,
        result: result || null,
        notes,
      },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        punchListItems: true,
        photos: true,
      },
    })
  },

  async updateReport(
    projectId: string,
    reportId: string,
    actor: QualityActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, projectId: true, inspectorId: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
    }

    const isOwner = report.inspectorId === actor.userId
    if (!isOwner && !canManageAnyReport(actor)) {
      throw new ForbiddenError('Bạn chỉ được sửa báo cáo chất lượng của mình')
    }

    if (report.status === 'APPROVED') {
      throw new BadRequestError('Báo cáo đã được duyệt, không thể chỉnh sửa trực tiếp')
    }

    const data: Prisma.QualityReportUpdateInput = {}

    if (payload.reportDate !== undefined) {
      data.reportDate = parseReportDate(payload.reportDate)
    }

    if (payload.location !== undefined) {
      data.location = parseTextField(payload.location, 'Vị trí', 500)
    }

    if (payload.description !== undefined) {
      data.description = parseTextField(payload.description, 'Nội dung', 20000)
    }

    if (payload.result !== undefined) {
      data.result = parseResult(payload.result) || null
    }

    if (payload.notes !== undefined) {
      data.notes = String(payload.notes).trim() || null
    }

    if (report.status === 'REJECTED') {
      data.status = 'PENDING'
      data.signedBy = null
      data.signedAt = null
    }

    if (payload.inspectorId !== undefined) {
      if (!canManageAnyReport(actor)) {
        throw new ForbiddenError('Bạn không được đổi người lập báo cáo')
      }

      const nextInspectorId = String(payload.inspectorId ?? '').trim()
      if (!nextInspectorId) {
        throw new BadRequestError('InspectorId không hợp lệ')
      }
      await ensureInspector(projectId, nextInspectorId)
      data.inspector = { connect: { id: nextInspectorId } }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Không có trường nào để cập nhật')
    }

    return prisma.qualityReport.update({
      where: { id: reportId },
      data,
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        punchListItems: true,
        photos: true,
      },
    })
  },

  async reopenReport(
    projectId: string,
    reportId: string,
    actor: QualityActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureProjectExists(projectId)

    if (!canManageAnyReport(actor)) {
      throw new ForbiddenError('Chỉ Admin hoặc PM được mở lại báo cáo đã duyệt')
    }

    const reason = parseReopenReason(payload.reason)
    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true, location: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
    }

    if (report.status !== 'APPROVED') {
      throw new BadRequestError('Chỉ báo cáo đã duyệt mới cần mở lại')
    }

    const updated = await prisma.qualityReport.update({
      where: { id: reportId },
      data: { status: 'PENDING', signedBy: null, signedAt: null },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        punchListItems: true,
        photos: true,
      },
    })

    await auditService.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.PROJECT,
      entityId: reportId,
      description: `Đã mở lại báo cáo chất lượng tại ${report.location}. Lý do: ${reason}`,
    })

    return updated
  },

  async signReport(projectId: string, reportId: string, actor: QualityActorContext) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestError('Báo cáo đã được ký nghiệm thu trước đó')
    }

    return prisma.qualityReport.update({
      where: { id: reportId },
      data: { status: 'APPROVED', signedBy: actor.userId, signedAt: new Date() },
      include: { inspector: { select: { id: true, name: true, email: true } } },
    })
  },

  async rejectReport(
    projectId: string,
    reportId: string,
    actor: QualityActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestError('Báo cáo đã được xử lý trước đó')
    }

    const reason = parseTextField(payload.reason ?? '', 'Lý do từ chối', 2000)

    return prisma.qualityReport.update({
      where: { id: reportId },
      data: {
        status: 'REJECTED',
        notes: reason,
        signedBy: actor.userId,
        signedAt: new Date(),
      },
      include: { inspector: { select: { id: true, name: true, email: true } } },
    })
  },

  async acceptReport(projectId: string, reportId: string, actor: QualityActorContext) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo chất lượng')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestError('Báo cáo đã được xử lý trước đó')
    }

    return prisma.qualityReport.update({
      where: { id: reportId },
      data: { status: 'APPROVED', signedBy: actor.userId, signedAt: new Date() },
      include: { inspector: { select: { id: true, name: true, email: true } } },
    })
  },

  // ─── Punch List Items ──────────────────────────────────────────────────────────

  async listPunchList(projectId: string, reportId: string) {
    await ensureReportInProject(projectId, reportId)

    const items = await prisma.qualityPunchListItem.findMany({
      where: { reportId },
      orderBy: { createdAt: 'asc' },
    })

    const open = items.filter((i) => i.status === 'OPEN').length
    const fixed = items.filter((i) => i.status === 'FIXED').length
    const accepted = items.filter((i) => i.status === 'ACCEPTED').length

    return { reportId, total: items.length, open, fixed, accepted, items }
  },

  async createPunchListItem(
    projectId: string,
    reportId: string,
    actor: QualityActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const title = parseTextField(payload.title, 'Tiêu đề', 255)
    const description = payload.description !== undefined ? String(payload.description).trim() || null : null
    const severity = parseSeverity(payload.severity ?? 'MEDIUM')
    const location = payload.location !== undefined ? String(payload.location).trim() || null : null

    return prisma.qualityPunchListItem.create({
      data: { reportId, title, description, severity, location },
    })
  },

  async updatePunchListItem(
    projectId: string,
    itemId: string,
    actor: QualityActorContext,
    payload: Record<string, unknown>,
  ) {
    // Verify item belongs to a report in this project
    const item = await prisma.qualityPunchListItem.findFirst({
      where: { id: itemId, report: { projectId } },
      include: { report: true },
    })

    if (!item) {
      throw new NotFoundError('Không tìm thấy mục punch list')
    }

    const data: Prisma.QualityPunchListItemUpdateInput = {}

    if (payload.title !== undefined) {
      data.title = parseTextField(payload.title, 'Tiêu đề', 255)
    }

    if (payload.description !== undefined) {
      data.description = String(payload.description).trim() || null
    }

    if (payload.severity !== undefined) {
      data.severity = parseSeverity(payload.severity)
    }

    if (payload.location !== undefined) {
      data.location = String(payload.location).trim() || null
    }

    if (payload.status !== undefined) {
      data.status = parsePunchListStatus(payload.status)
      if (payload.status === 'FIXED') {
        data.fixedAt = new Date()
      }
    }

    if (payload.note !== undefined) {
      data.note = String(payload.note).trim() || null
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Không có trường nào để cập nhật')
    }

    return prisma.qualityPunchListItem.update({ where: { id: itemId }, data })
  },

  async deletePunchListItem(projectId: string, itemId: string) {
    const item = await prisma.qualityPunchListItem.findFirst({
      where: { id: itemId, report: { projectId } },
    })

    if (!item) {
      throw new NotFoundError('Không tìm thấy mục punch list')
    }

    await prisma.qualityPunchListItem.delete({ where: { id: itemId } })

    return { deleted: true, id: itemId }
  },

  // ─── Photos ────────────────────────────────────��──────────────────────────────

  async listPhotos(projectId: string, reportId: string, type?: string) {
    await ensureReportInProject(projectId, reportId)

    const where: Prisma.QualityReportPhotoWhereInput = { reportId }

    if (type === 'BEFORE' || type === 'AFTER') {
      where.type = type
    }

    const photos = await prisma.qualityReportPhoto.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    return { reportId, total: photos.length, photos }
  },

  async addPhoto(projectId: string, reportId: string, actor: QualityActorContext, payload: Record<string, unknown>) {
    await ensureReportInProject(projectId, reportId)

    const photoUrl = parseTextField(payload.photoUrl, 'URL ảnh', 500)
    const type = String(payload.type ?? 'BEFORE').toUpperCase()
    if (type !== 'BEFORE' && type !== 'AFTER') {
      throw new BadRequestError('Loại ảnh phải là BEFORE hoặc AFTER')
    }
    const caption = payload.caption !== undefined ? String(payload.caption).trim() || null : null

    return prisma.qualityReportPhoto.create({
      data: { reportId, type, photoUrl, caption },
    })
  },

  async deletePhoto(projectId: string, photoId: string) {
    const photo = await prisma.qualityReportPhoto.findFirst({
      where: { id: photoId, report: { projectId } },
    })

    if (!photo) {
      throw new NotFoundError('Không tìm thấy ảnh')
    }

    await prisma.qualityReportPhoto.delete({ where: { id: photoId } })

    return { deleted: true, id: photoId }
  },
}

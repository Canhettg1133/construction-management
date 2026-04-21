import { prisma } from '../../config/database'
import { AuditEntityType, Prisma } from '@prisma/client'
import type { ProjectRole, SystemRole } from '@construction/shared'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors'
import { notificationTriggers } from '../notifications/notification.triggers'
import { auditService } from '../audit/audit.service'

interface SafetyActorContext {
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

function parseViolations(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return 0
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestError('Số vi phạm không hợp lệ')
  }
  return parsed
}

function parsePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestError('Danh sách ảnh không hợp lệ')
  }

  const photos = value.map((item) => String(item).trim()).filter((item) => item.length > 0)

  if (photos.some((item) => item.length > 1000)) {
    throw new BadRequestError('Đường dẫn ảnh vượt quá giới hạn')
  }

  return photos
}

function parseSeverity(value: unknown): string {
  const allowed = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const s = String(value ?? 'MEDIUM').toUpperCase()
  if (!allowed.includes(s)) {
    throw new BadRequestError(`Mức độ nghiêm trọng phải là: ${allowed.join(' | ')}`)
  }
  return s
}

function parseIncidentStatus(value: unknown): string {
  const allowed = ['OPEN', 'UNDER_REVIEW', 'CLOSED']
  const s = String(value ?? 'OPEN').toUpperCase()
  if (!allowed.includes(s)) {
    throw new BadRequestError(`Trạng thái sự cố phải là: ${allowed.join(' | ')}`)
  }
  return s
}

function parseNearMissStatus(value: unknown): string {
  const allowed = ['REPORTED', 'INVESTIGATING', 'RESOLVED']
  const s = String(value ?? 'REPORTED').toUpperCase()
  if (!allowed.includes(s)) {
    throw new BadRequestError(`Trạng thái gần-miss phải là: ${allowed.join(' | ')}`)
  }
  return s
}

function parseCorrectiveStatus(value: unknown): string {
  const allowed = ['PENDING', 'IN_PROGRESS', 'DONE', 'OVERDUE']
  const s = String(value ?? 'PENDING').toUpperCase()
  if (!allowed.includes(s)) {
    throw new BadRequestError(`Trạng thái hành động khắc phục phải là: ${allowed.join(' | ')}`)
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
  const report = await prisma.safetyReport.findFirst({
    where: { id: reportId, projectId },
    select: { id: true, inspectorId: true, status: true },
  })

  if (!report) {
    throw new NotFoundError('Không tìm thấy báo cáo an toàn')
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

function canManageAnyReport(actor: SafetyActorContext): boolean {
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

export const safetyService = {
  async listReports(projectId: string) {
    await ensureProjectExists(projectId)

    const reports = await prisma.safetyReport.findMany({
      where: { projectId },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
        checklistItems: true,
        incident: true,
        nearMiss: true,
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    })

    const summary = reports.reduce(
      (acc, report) => {
        acc.total += 1
        acc.violations += report.violations
        if (report.status === 'PENDING') acc.pending += 1
        if (report.status === 'APPROVED') acc.approved += 1
        if (report.status === 'REJECTED') acc.rejected += 1
        return acc
      },
      { total: 0, violations: 0, pending: 0, approved: 0, rejected: 0 },
    )

    return { projectId, summary, reports }
  },

  async getReport(projectId: string, reportId: string) {
    await ensureProjectExists(projectId)

    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        checklistItems: { orderBy: { createdAt: 'asc' } },
        incident: {
          include: {
            correctiveActions: {
              include: {
                assignee: { select: { id: true, name: true, email: true } },
                creator: { select: { id: true, name: true, email: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        nearMiss: true,
      },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo an toàn')
    }

    return report
  },

  async createReport(projectId: string, actor: SafetyActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    const reportDate = parseReportDate(payload.reportDate)
    const location = parseTextField(payload.location, 'Vị trí', 500)
    const description = parseTextField(payload.description, 'Nội dung', 20000)
    const violations = parseViolations(payload.violations)
    const photos = payload.photos !== undefined ? parsePhotos(payload.photos) : undefined
    const inspectorId = String(payload.inspectorId ?? actor.userId)

    if (!canManageAnyReport(actor) && inspectorId !== actor.userId) {
      throw new ForbiddenError('Bạn chỉ được tạo báo cáo an toàn của chính mình')
    }

    await ensureInspector(projectId, inspectorId)

    // Create report and optionally checklist items and incident in a transaction
    const report = await prisma.safetyReport.create({
      data: {
        projectId,
        reportDate,
        inspectorId,
        location,
        description,
        violations,
        photos,
        checklistItems: payload.checklistItems
          ? {
              create: (payload.checklistItems as Array<{ label: string; checked?: boolean }>).map((item) => ({
                label: item.label,
                checked: Boolean(item.checked),
              })),
            }
          : undefined,
        incident: payload.incident
          ? {
              create: {
                severity: parseSeverity((payload.incident as Record<string, unknown>).severity),
                involvedPersons: String((payload.incident as Record<string, unknown>).involvedPersons ?? ''),
                immediateAction: String((payload.incident as Record<string, unknown>).immediateAction ?? ''),
                damages: String((payload.incident as Record<string, unknown>).damages ?? ''),
              },
            }
          : undefined,
      },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        checklistItems: true,
        incident: true,
        nearMiss: true,
      },
    })

    try {
      await notificationTriggers.safetyReportPending({ projectId, reportId: report.id, location: report.location })

      if (report.violations > 0) {
        await notificationTriggers.safetyViolationCreated({
          projectId,
          reportId: report.id,
          location: report.location,
          violations: report.violations,
        })
      }
    } catch {
      // Non-blocking notification
    }

    return report
  },

  async updateReport(projectId: string, reportId: string, actor: SafetyActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, projectId: true, inspectorId: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo an toàn')
    }

    const isOwner = report.inspectorId === actor.userId
    if (!isOwner && !canManageAnyReport(actor)) {
      throw new ForbiddenError('Bạn chỉ được sửa báo cáo an toàn của mình')
    }

    if (report.status === 'APPROVED') {
      throw new BadRequestError('Báo cáo đã được duyệt, không thể chỉnh sửa trực tiếp')
    }

    const data: Prisma.SafetyReportUpdateInput = {}

    if (payload.reportDate !== undefined) {
      data.reportDate = parseReportDate(payload.reportDate)
    }

    if (payload.location !== undefined) {
      data.location = parseTextField(payload.location, 'Vị trí', 500)
    }

    if (payload.description !== undefined) {
      data.description = parseTextField(payload.description, 'Nội dung', 20000)
    }

    if (payload.violations !== undefined) {
      data.violations = parseViolations(payload.violations)
    }

    if (payload.photos !== undefined) {
      data.photos = payload.photos === null ? Prisma.JsonNull : parsePhotos(payload.photos)
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

    return prisma.safetyReport.update({
      where: { id: reportId },
      data,
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        checklistItems: true,
        incident: true,
        nearMiss: true,
      },
    })
  },

  async reopenReport(projectId: string, reportId: string, actor: SafetyActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    if (!canManageAnyReport(actor)) {
      throw new ForbiddenError('Chỉ Admin hoặc PM được mở lại báo cáo đã duyệt')
    }

    const reason = parseReopenReason(payload.reason)
    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true, location: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo an toàn')
    }

    if (report.status !== 'APPROVED') {
      throw new BadRequestError('Chỉ báo cáo đã duyệt mới cần mở lại')
    }

    const updated = await prisma.safetyReport.update({
      where: { id: reportId },
      data: { status: 'PENDING', signedBy: null, signedAt: null },
      include: {
        inspector: { select: { id: true, name: true, email: true } },
        checklistItems: true,
        incident: true,
        nearMiss: true,
      },
    })

    await auditService.log({
      userId: actor.userId,
      action: 'STATUS_CHANGE',
      entityType: AuditEntityType.PROJECT,
      entityId: reportId,
      description: `Đã mở lại báo cáo an toàn tại ${report.location}. Lý do: ${reason}`,
    })

    return updated
  },

  async signReport(projectId: string, reportId: string, actor: SafetyActorContext) {
    await ensureProjectExists(projectId)

    const report = await prisma.safetyReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Không tìm thấy báo cáo an toàn')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestError('Báo cáo đã được ký duyệt trước đó')
    }

    return prisma.safetyReport.update({
      where: { id: reportId },
      data: { status: 'APPROVED', signedBy: actor.userId, signedAt: new Date() },
      include: { inspector: { select: { id: true, name: true, email: true } } },
    })
  },

  // ─── Checklist Items ──────────────────────────────────────────────────────────

  async listChecklist(projectId: string, reportId: string) {
    await ensureReportInProject(projectId, reportId)

    const items = await prisma.safetyChecklistItem.findMany({
      where: { reportId },
      orderBy: { createdAt: 'asc' },
    })

    const checkedCount = items.filter((i) => i.checked).length

    return { reportId, total: items.length, checked: checkedCount, items }
  },

  async upsertChecklistItem(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const label = parseTextField(payload.label, 'Nhãn checklist', 255)
    const checked = Boolean(payload.checked)
    const note = payload.note !== undefined ? String(payload.note).trim() || null : null

    // Check if item with same label already exists
    const existing = await prisma.safetyChecklistItem.findFirst({
      where: { reportId, label },
    })

    if (existing) {
      return prisma.safetyChecklistItem.update({
        where: { id: existing.id },
        data: { checked, note },
      })
    }

    return prisma.safetyChecklistItem.create({
      data: { reportId, label, checked, note },
    })
  },

  async updateChecklistItem(
    projectId: string,
    reportId: string,
    itemId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const item = await prisma.safetyChecklistItem.findFirst({
      where: { id: itemId, reportId },
    })

    if (!item) {
      throw new NotFoundError('Không tìm thấy mục checklist')
    }

    const data: Prisma.SafetyChecklistItemUpdateInput = {}

    if (payload.checked !== undefined) {
      data.checked = Boolean(payload.checked)
    }

    if (payload.note !== undefined) {
      data.note = String(payload.note).trim() || null
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Không có trường nào để cập nhật')
    }

    return prisma.safetyChecklistItem.update({
      where: { id: itemId },
      data,
    })
  },

  // ─── Incident ────────────────────────────────────────────────────────────────

  async createIncident(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    // Check if incident already exists for this report
    const existing = await prisma.safetyIncident.findUnique({ where: { reportId } })
    if (existing) {
      throw new BadRequestError('Đã có sự cố cho báo cáo này. Hãy cập nhật thay vì tạo mới.')
    }

    const data = {
      reportId,
      severity: parseSeverity(payload.severity),
      involvedPersons: String(payload.involvedPersons ?? ''),
      immediateAction: String(payload.immediateAction ?? ''),
      damages: String(payload.damages ?? ''),
    }

    return prisma.safetyIncident.create({
      data,
      include: { correctiveActions: true },
    })
  },

  async updateIncident(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const incident = await prisma.safetyIncident.findUnique({ where: { reportId } })
    if (!incident) {
      throw new NotFoundError('Không tìm thấy sự cố cho báo cáo này')
    }

    const data: Prisma.SafetyIncidentUpdateInput = {}

    if (payload.severity !== undefined) {
      data.severity = parseSeverity(payload.severity)
    }

    if (payload.status !== undefined) {
      data.status = parseIncidentStatus(payload.status)
    }

    if (payload.involvedPersons !== undefined) {
      data.involvedPersons = String(payload.involvedPersons)
    }

    if (payload.immediateAction !== undefined) {
      data.immediateAction = String(payload.immediateAction)
    }

    if (payload.damages !== undefined) {
      data.damages = String(payload.damages)
    }

    return prisma.safetyIncident.update({
      where: { id: incident.id },
      data,
      include: { correctiveActions: true },
    })
  },

  // ─── Near Miss ───────────────────────────────────────────────────────────────

  async createNearMiss(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const existing = await prisma.safetyNearMiss.findUnique({ where: { reportId } })
    if (existing) {
      throw new BadRequestError('Đã có báo cáo gần-miss cho báo cáo này. Hãy cập nhật thay vì tạo mới.')
    }

    const description = parseTextField(payload.description, 'Mô tả', 20000)

    return prisma.safetyNearMiss.create({
      data: {
        reportId,
        reporterId: actor.userId,
        description,
        potentialHarm: String(payload.potentialHarm ?? ''),
        witnesses: String(payload.witnesses ?? ''),
        rootCause: String(payload.rootCause ?? ''),
        likelihood: String(payload.likelihood ?? 'MEDIUM').toUpperCase(),
        severity: parseSeverity(payload.severity ?? 'MEDIUM'),
      },
    })
  },

  async updateNearMiss(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const nearMiss = await prisma.safetyNearMiss.findUnique({ where: { reportId } })
    if (!nearMiss) {
      throw new NotFoundError('Không tìm thấy báo cáo gần-miss cho báo cáo này')
    }

    const data: Prisma.SafetyNearMissUpdateInput = {}

    if (payload.description !== undefined) {
      data.description = parseTextField(payload.description, 'Mô tả', 20000)
    }

    if (payload.potentialHarm !== undefined) {
      data.potentialHarm = String(payload.potentialHarm)
    }

    if (payload.witnesses !== undefined) {
      data.witnesses = String(payload.witnesses)
    }

    if (payload.rootCause !== undefined) {
      data.rootCause = String(payload.rootCause)
    }

    if (payload.likelihood !== undefined) {
      data.likelihood = String(payload.likelihood).toUpperCase()
    }

    if (payload.severity !== undefined) {
      data.severity = parseSeverity(payload.severity)
    }

    if (payload.status !== undefined) {
      const s = parseNearMissStatus(payload.status)
      data.status = s
      if (s === 'RESOLVED') {
        data.resolvedAt = new Date()
      }
    }

    return prisma.safetyNearMiss.update({
      where: { id: nearMiss.id },
      data,
    })
  },

  // ─── Corrective Actions ──────────────────────────────────────────────────────

  async listCorrectiveActions(projectId: string, reportId: string) {
    await ensureReportInProject(projectId, reportId)

    const incident = await prisma.safetyIncident.findUnique({
      where: { reportId },
      include: {
        correctiveActions: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            creator: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!incident) {
      return { reportId, incident: null, actions: [] }
    }

    return { reportId, incident: incident.id, actions: incident.correctiveActions }
  },

  async createCorrectiveAction(
    projectId: string,
    reportId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    await ensureReportInProject(projectId, reportId)

    const incident = await prisma.safetyIncident.findUnique({ where: { reportId } })
    if (!incident) {
      throw new NotFoundError('Cần tạo sự cố trước khi thêm hành động khắc phục')
    }

    const title = parseTextField(payload.title, 'Tiêu đề', 255)
    const description = parseTextField(payload.description, 'Mô tả', 20000)
    const assignedTo = payload.assignedTo ? String(payload.assignedTo).trim() : null
    const dueDate = payload.dueDate ? parseReportDate(payload.dueDate) : null

    if (assignedTo) {
      await ensureInspector(projectId, assignedTo)
    }

    return prisma.safetyCorrectiveAction.create({
      data: {
        incidentId: incident.id,
        title,
        description,
        assignedTo,
        dueDate,
        status: 'PENDING',
        createdBy: actor.userId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })
  },

  async updateCorrectiveAction(
    projectId: string,
    actionId: string,
    actor: SafetyActorContext,
    payload: Record<string, unknown>,
  ) {
    // First verify the action belongs to an incident in this project
    const action = await prisma.safetyCorrectiveAction.findFirst({
      where: {
        id: actionId,
        incident: { report: { projectId } },
      },
      include: { incident: { include: { report: true } } },
    })

    if (!action) {
      throw new NotFoundError('Không tìm thấy hành động khắc phục')
    }

    const data: Prisma.SafetyCorrectiveActionUpdateInput = {}

    if (payload.title !== undefined) {
      data.title = parseTextField(payload.title, 'Tiêu đề', 255)
    }

    if (payload.description !== undefined) {
      data.description = parseTextField(payload.description, 'Mô tả', 20000)
    }

    if (payload.assignedTo !== undefined) {
      const nextAssignee = String(payload.assignedTo).trim()
      if (nextAssignee) {
        await ensureInspector(action.incident.report.projectId, nextAssignee)
        data.assignee = { connect: { id: nextAssignee } }
      } else {
        data.assignee = { disconnect: true }
      }
    }

    if (payload.dueDate !== undefined) {
      data.dueDate = payload.dueDate === null ? null : parseReportDate(payload.dueDate)
    }

    if (payload.status !== undefined) {
      data.status = parseCorrectiveStatus(payload.status)
      if (payload.status === 'DONE') {
        data.completedAt = new Date()
      }
    }

    if (payload.completedNote !== undefined) {
      data.completedNote = String(payload.completedNote).trim() || null
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Không có trường nào để cập nhật')
    }

    return prisma.safetyCorrectiveAction.update({
      where: { id: actionId },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    })
  },
}

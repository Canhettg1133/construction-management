import { prisma } from '../../config/database'
import type { ProjectRole, SystemRole } from '@construction/shared'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors'
import { notificationTriggers } from '../notifications/notification.triggers'

interface QualityActorContext {
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
}

function parseReportDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError('Ngay bao cao khong hop le')
  }
  return date
}

function parseTextField(value: unknown, fieldName: string, maxLength: number): string {
  const text = String(value ?? '').trim()
  if (!text) {
    throw new BadRequestError(`${fieldName} khong duoc de trong`)
  }
  if (text.length > maxLength) {
    throw new BadRequestError(`${fieldName} vuot qua ${maxLength} ky tu`)
  }
  return text
}

async function ensureProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  })

  if (!project) {
    throw new NotFoundError('Khong tim thay du an')
  }

  return project
}

async function ensureInspector(projectId: string, inspectorId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: inspectorId } },
    select: { userId: true },
  })

  if (!member) {
    throw new BadRequestError('Nguoi lap bao cao khong thuoc du an')
  }
}

function canManageAnyReport(actor: QualityActorContext): boolean {
  return actor.systemRole === 'ADMIN' || actor.projectRole === 'PROJECT_MANAGER'
}

export const qualityService = {
  async listReports(projectId: string) {
    await ensureProjectExists(projectId)

    const reports = await prisma.qualityReport.findMany({
      where: { projectId },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
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
      {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      },
    )

    const passRate = summary.total > 0 ? Number(((summary.approved / summary.total) * 100).toFixed(2)) : 0

    return {
      projectId,
      summary: {
        ...summary,
        passRate,
      },
      reports,
    }
  },

  async getReport(projectId: string, reportId: string) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!report) {
      throw new NotFoundError('Khong tim thay bao cao chat luong')
    }

    return report
  },

  async createReport(projectId: string, actor: QualityActorContext, payload: Record<string, unknown>) {
    await ensureProjectExists(projectId)

    const reportDate = parseReportDate(payload.reportDate)
    const location = parseTextField(payload.location, 'Vi tri', 500)
    const description = parseTextField(payload.description, 'Noi dung', 20000)
    const inspectorId = String(payload.inspectorId ?? actor.userId)

    if (!canManageAnyReport(actor) && inspectorId !== actor.userId) {
      throw new ForbiddenError('Ban chi duoc tao bao cao chat luong cua chinh minh')
    }

    await ensureInspector(projectId, inspectorId)

    const report = await prisma.qualityReport.create({
      data: {
        projectId,
        reportDate,
        inspectorId,
        location,
        description,
      },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    try {
      await notificationTriggers.qualityReportPending({
        projectId,
        reportId: report.id,
        location: report.location,
      })
    } catch {
      // Non-blocking notification
    }

    return report
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
      select: {
        id: true,
        projectId: true,
        inspectorId: true,
        status: true,
      },
    })

    if (!report) {
      throw new NotFoundError('Khong tim thay bao cao chat luong')
    }

    const isOwner = report.inspectorId === actor.userId
    if (!isOwner && !canManageAnyReport(actor)) {
      throw new ForbiddenError('Ban chi duoc sua bao cao chat luong cua minh')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestError('Bao cao da ky nghiem thu, khong the chinh sua')
    }

    const data: {
      reportDate?: Date
      location?: string
      description?: string
      inspectorId?: string
    } = {}

    if (payload.reportDate !== undefined) {
      data.reportDate = parseReportDate(payload.reportDate)
    }

    if (payload.location !== undefined) {
      data.location = parseTextField(payload.location, 'Vi tri', 500)
    }

    if (payload.description !== undefined) {
      data.description = parseTextField(payload.description, 'Noi dung', 20000)
    }

    if (payload.inspectorId !== undefined) {
      if (!canManageAnyReport(actor)) {
        throw new ForbiddenError('Ban khong duoc doi nguoi lap bao cao')
      }

      const nextInspectorId = String(payload.inspectorId ?? '').trim()
      if (!nextInspectorId) {
        throw new BadRequestError('InspectorId khong hop le')
      }
      await ensureInspector(projectId, nextInspectorId)
      data.inspectorId = nextInspectorId
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestError('Khong co truong nao de cap nhat')
    }

    return prisma.qualityReport.update({
      where: { id: reportId },
      data,
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  },

  async signReport(projectId: string, reportId: string, actor: QualityActorContext) {
    await ensureProjectExists(projectId)

    const report = await prisma.qualityReport.findFirst({
      where: { id: reportId, projectId },
      select: { id: true, status: true },
    })

    if (!report) {
      throw new NotFoundError('Khong tim thay bao cao chat luong')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestError('Bao cao da duoc nghiem thu truoc do')
    }

    return prisma.qualityReport.update({
      where: { id: reportId },
      data: {
        status: 'APPROVED',
        signedBy: actor.userId,
        signedAt: new Date(),
      },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  },
}

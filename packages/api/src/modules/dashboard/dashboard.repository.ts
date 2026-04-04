import { prisma } from '../../config/database'
import type {
  BudgetOverview,
  DashboardActiveMember,
  DashboardOverdueTask,
  DashboardRiskyProject,
  DashboardWeeklyProgress,
  ProjectProgressStats,
  ProjectRole,
  QualityDashboardStats,
  SafetyDashboardStats,
  SafetyViolation,
  TaskStatus,
  WarehouseDashboardStats,
  WarehouseTrendDataPoint,
} from '@construction/shared'
import { NotFoundError } from '../../shared/errors'
import { Prisma } from '@prisma/client'

const OPEN_TASK_STATUSES: TaskStatus[] = ['TO_DO', 'IN_PROGRESS']
const CLOSED_TASK_STATUSES: TaskStatus[] = ['DONE', 'CANCELLED']
const TASK_STATUSES: TaskStatus[] = ['TO_DO', 'IN_PROGRESS', 'DONE', 'CANCELLED']
const SAFETY_KEYWORDS = ['safety', 'an toan', 'vi pham']

function startOfDay(base = new Date()): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate())
}

function addDays(base: Date, delta: number): Date {
  const next = new Date(base)
  next.setDate(next.getDate() + delta)
  return next
}

function startOfMonth(base = new Date()): Date {
  return new Date(base.getFullYear(), base.getMonth(), 1)
}

function startOfWeek(base = new Date()): Date {
  const date = startOfDay(base)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + mondayOffset)
  return date
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  return value.toNumber()
}

function roundTo(value: number, digits = 2): number {
  const base = Math.pow(10, digits)
  return Math.round(value * base) / base
}

function normalizeProjectIds(projectIds?: string[]): string[] | undefined {
  if (!projectIds) return undefined
  return Array.from(new Set(projectIds.filter(Boolean)))
}

function projectFilter(projectIds?: string[]): Prisma.ProjectWhereInput {
  const normalized = normalizeProjectIds(projectIds)
  if (!normalized) return {}
  if (normalized.length === 0) {
    return { id: '__none__' }
  }
  return { id: { in: normalized } }
}

function mapTaskStatusCounts(
  rows: Array<{
    status: string
    _count: { status: number }
  }>,
): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = {
    TO_DO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    CANCELLED: 0,
  }

  for (const row of rows) {
    if (TASK_STATUSES.includes(row.status as TaskStatus)) {
      counts[row.status as TaskStatus] = row._count.status
    }
  }

  return counts
}

function mergeTaskWhere(...conditions: Prisma.TaskWhereInput[]): Prisma.TaskWhereInput {
  const nonEmpty = conditions.filter((condition) => Object.keys(condition).length > 0)
  if (nonEmpty.length === 0) return {}
  if (nonEmpty.length === 1) return nonEmpty[0]
  return { AND: nonEmpty }
}

interface TaskFilters {
  projectIds?: string[]
  assigneeId?: string
  tags?: string[]
}

interface ActivityFilters {
  projectIds?: string[]
  userId?: string
}

export interface DashboardRoleEntry {
  projectId: string
  role: ProjectRole
}

function buildTaskFilterWhere(filters: TaskFilters = {}): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {}
  const normalizedProjectIds = normalizeProjectIds(filters.projectIds)

  if (normalizedProjectIds) {
    if (normalizedProjectIds.length === 0) {
      return { id: '__none__' }
    }
    where.projectId = { in: normalizedProjectIds }
  }

  if (filters.assigneeId) {
    where.assignedTo = filters.assigneeId
  }

  if (filters.tags && filters.tags.length > 0) {
    const tags = filters.tags.map((tag) => tag.trim()).filter(Boolean)
    if (tags.length > 0) {
      const tagSearch: Prisma.TaskWhereInput[] = tags.flatMap((tag) => [
        { title: { contains: tag } },
        { description: { contains: tag } },
      ])
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []
      where.AND = [...existingAnd, { OR: tagSearch }]
    }
  }

  return where
}

function violationSeverity(violations: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (violations >= 5) return 'HIGH'
  if (violations >= 2) return 'MEDIUM'
  return 'LOW'
}

async function buildTaskWeeklyProgress(where: Prisma.TaskWhereInput): Promise<DashboardWeeklyProgress[]> {
  const today = startOfDay()
  const ranges = Array.from({ length: 7 }, (_, idx) => {
    const day = addDays(today, idx - 6)
    return {
      day,
      nextDay: addDays(day, 1),
      date: isoDate(day),
    }
  })

  return Promise.all(
    ranges.map(async ({ day, nextDay, date }) => {
      const [newTasks, completedTasks] = await Promise.all([
        prisma.task.count({
          where: mergeTaskWhere(where, {
            createdAt: { gte: day, lt: nextDay },
          }),
        }),
        prisma.task.count({
          where: mergeTaskWhere(where, {
            completedAt: { gte: day, lt: nextDay },
            status: 'DONE',
          }),
        }),
      ])

      return {
        date,
        totalTasks: newTasks,
        completedTasks,
        newTasks,
      }
    }),
  )
}

async function buildReportWeeklyProgress(
  model: 'safetyReport' | 'qualityReport',
  where: Prisma.SafetyReportWhereInput | Prisma.QualityReportWhereInput,
): Promise<DashboardWeeklyProgress[]> {
  const today = startOfDay()
  const ranges = Array.from({ length: 7 }, (_, idx) => {
    const day = addDays(today, idx - 6)
    return {
      day,
      nextDay: addDays(day, 1),
      date: isoDate(day),
    }
  })

  return Promise.all(
    ranges.map(async ({ day, nextDay, date }) => {
      const dayWhere =
        model === 'safetyReport'
          ? ({
              AND: [where as Prisma.SafetyReportWhereInput, { reportDate: { gte: day, lt: nextDay } }],
            } satisfies Prisma.SafetyReportWhereInput)
          : ({
              AND: [where as Prisma.QualityReportWhereInput, { reportDate: { gte: day, lt: nextDay } }],
            } satisfies Prisma.QualityReportWhereInput)

      const approvedWhere =
        model === 'safetyReport'
          ? ({
              AND: [
                where as Prisma.SafetyReportWhereInput,
                { reportDate: { gte: day, lt: nextDay }, status: 'APPROVED' },
              ],
            } satisfies Prisma.SafetyReportWhereInput)
          : ({
              AND: [
                where as Prisma.QualityReportWhereInput,
                { reportDate: { gte: day, lt: nextDay }, status: 'APPROVED' },
              ],
            } satisfies Prisma.QualityReportWhereInput)

      const [newReports, approvedReports] = await Promise.all([
        model === 'safetyReport'
          ? prisma.safetyReport.count({ where: dayWhere as Prisma.SafetyReportWhereInput })
          : prisma.qualityReport.count({ where: dayWhere as Prisma.QualityReportWhereInput }),
        model === 'safetyReport'
          ? prisma.safetyReport.count({ where: approvedWhere as Prisma.SafetyReportWhereInput })
          : prisma.qualityReport.count({ where: approvedWhere as Prisma.QualityReportWhereInput }),
      ])

      return {
        date,
        totalTasks: newReports,
        completedTasks: approvedReports,
        newTasks: newReports,
      }
    }),
  )
}

export const dashboardRepository = {
  async findUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, systemRole: true },
    })
    if (!user) {
      throw new NotFoundError('Khong tim thay nguoi dung')
    }
    return user
  },

  async getProjectRoles(userId: string): Promise<DashboardRoleEntry[]> {
    return prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true, role: true },
    })
  },

  async getMemberProjectIds(userId: string): Promise<string[]> {
    const rows = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
      distinct: ['projectId'],
    })
    return rows.map((row) => row.projectId)
  },

  countProjects(filters?: { projectIds?: string[] }) {
    return prisma.project.count({
      where: projectFilter(filters?.projectIds),
    })
  },

  countActiveProjects(filters?: { projectIds?: string[] }) {
    return prisma.project.count({
      where: {
        ...projectFilter(filters?.projectIds),
        status: 'ACTIVE',
      },
    })
  },

  countOpenTasks(filters: TaskFilters = {}) {
    return prisma.task.count({
      where: mergeTaskWhere(buildTaskFilterWhere(filters), {
        status: { in: OPEN_TASK_STATUSES },
      }),
    })
  },

  countOverdueTasks(filters: TaskFilters = {}) {
    const today = startOfDay()
    return prisma.task.count({
      where: mergeTaskWhere(buildTaskFilterWhere(filters), {
        status: { in: OPEN_TASK_STATUSES },
        dueDate: { lt: today },
      }),
    })
  },

  countTodayReports(today: Date, filters?: { projectIds?: string[]; createdBy?: string }) {
    const from = startOfDay(today)
    const to = addDays(from, 1)
    return prisma.dailyReport.count({
      where: {
        ...(filters?.projectIds
          ? {
              projectId: {
                in: normalizeProjectIds(filters.projectIds) ?? [],
              },
            }
          : {}),
        ...(filters?.createdBy ? { createdBy: filters.createdBy } : {}),
        reportDate: { gte: from, lt: to },
        status: 'SENT',
      },
    })
  },

  async countActiveMembers(filters?: { projectIds?: string[] }) {
    const normalizedProjectIds = normalizeProjectIds(filters?.projectIds)
    if (!normalizedProjectIds) {
      return prisma.user.count({
        where: { isActive: true },
      })
    }

    if (normalizedProjectIds.length === 0) {
      return 0
    }

    const members = await prisma.projectMember.findMany({
      where: { projectId: { in: normalizedProjectIds } },
      select: { userId: true },
      distinct: ['userId'],
    })
    const userIds = members.map((item) => item.userId)
    if (userIds.length === 0) return 0

    return prisma.user.count({
      where: {
        id: { in: userIds },
        isActive: true,
      },
    })
  },

  countTasksByStatus(filters: TaskFilters = {}) {
    return prisma.task.groupBy({
      by: ['status'],
      where: buildTaskFilterWhere(filters),
      _count: { status: true },
    })
  },

  async findRecentActivity(limit: number, filters?: ActivityFilters) {
    const where: Prisma.AuditLogWhereInput = {}
    const normalizedProjectIds = normalizeProjectIds(filters?.projectIds)

    if (filters?.userId) {
      where.userId = filters.userId
    }

    if (normalizedProjectIds) {
      if (normalizedProjectIds.length === 0) {
        return []
      }
      const members = await prisma.projectMember.findMany({
        where: { projectId: { in: normalizedProjectIds } },
        select: { userId: true },
        distinct: ['userId'],
      })
      const userIds = members.map((member) => member.userId)
      if (userIds.length === 0) {
        return []
      }
      if (typeof where.userId === 'string') {
        if (!userIds.includes(where.userId)) {
          return []
        }
      } else {
        where.userId = { in: userIds }
      }
    }

    return prisma.auditLog.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  },

  findWeeklyProgress(filters?: TaskFilters) {
    return buildTaskWeeklyProgress(buildTaskFilterWhere(filters))
  },

  async countPendingApprovals(filters?: { projectIds?: string[] }) {
    const normalizedProjectIds = normalizeProjectIds(filters?.projectIds)
    const projectIdFilter =
      normalizedProjectIds && normalizedProjectIds.length > 0 ? { projectId: { in: normalizedProjectIds } } : undefined

    if (normalizedProjectIds && normalizedProjectIds.length === 0) {
      return { taskCount: 0, reportCount: 0 }
    }

    const [taskCount, reportCount] = await Promise.all([
      prisma.task.count({
        where: {
          ...(projectIdFilter ?? {}),
          approvalStatus: 'PENDING',
          requiresApproval: true,
          status: { notIn: CLOSED_TASK_STATUSES },
        },
      }),
      prisma.dailyReport.count({
        where: {
          ...(projectIdFilter ?? {}),
          approvalStatus: 'PENDING',
        },
      }),
    ])

    return { taskCount, reportCount }
  },

  async findOverdueTasks(filters?: {
    projectIds?: string[]
    assigneeId?: string
    limit?: number
  }): Promise<DashboardOverdueTask[]> {
    const today = startOfDay()
    const tasks = await prisma.task.findMany({
      where: mergeTaskWhere(
        buildTaskFilterWhere({
          projectIds: filters?.projectIds,
          assigneeId: filters?.assigneeId,
        }),
        {
          dueDate: { lt: today },
          status: { in: OPEN_TASK_STATUSES },
        },
      ),
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: filters?.limit ?? 10,
      select: {
        id: true,
        projectId: true,
        title: true,
        dueDate: true,
        priority: true,
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    })

    return tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      dueDate: task.dueDate ? task.dueDate.toISOString() : '',
      priority: task.priority,
      projectName: task.project.name,
      assigneeName: task.assignee?.name ?? null,
      daysOverdue: task.dueDate
        ? Math.max(0, Math.floor((today.getTime() - startOfDay(task.dueDate).getTime()) / 86400000))
        : 0,
    }))
  },

  async findRiskyProjects(filters?: { projectIds?: string[]; limit?: number }): Promise<DashboardRiskyProject[]> {
    const normalizedProjectIds = normalizeProjectIds(filters?.projectIds)
    if (normalizedProjectIds && normalizedProjectIds.length === 0) {
      return []
    }

    const projects = await prisma.project.findMany({
      where: {
        status: 'ACTIVE',
        ...(normalizedProjectIds ? { id: { in: normalizedProjectIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        tasks: {
          select: {
            dueDate: true,
            status: true,
          },
        },
      },
    })

    const today = startOfDay()
    return projects
      .map((project) => {
        const totalTasks = project.tasks.length
        const overdueTasks = project.tasks.filter(
          (task) =>
            task.dueDate &&
            startOfDay(task.dueDate).getTime() < today.getTime() &&
            OPEN_TASK_STATUSES.includes(task.status as TaskStatus),
        ).length
        const overdueRate = totalTasks > 0 ? roundTo((overdueTasks / totalTasks) * 100, 1) : 0
        return {
          id: project.id,
          name: project.name,
          totalTasks,
          overdueTasks,
          overdueRate,
        }
      })
      .filter((project) => project.overdueTasks > 0)
      .sort((a, b) => b.overdueRate - a.overdueRate || b.overdueTasks - a.overdueTasks)
      .slice(0, filters?.limit ?? 5)
  },

  async findActiveMembers(filters?: { projectIds?: string[]; limit?: number }): Promise<DashboardActiveMember[]> {
    const from = addDays(startOfDay(), -6)
    const where: Prisma.AuditLogWhereInput = {
      createdAt: { gte: from },
    }

    const normalizedProjectIds = normalizeProjectIds(filters?.projectIds)
    if (normalizedProjectIds) {
      if (normalizedProjectIds.length === 0) {
        return []
      }
      const members = await prisma.projectMember.findMany({
        where: { projectId: { in: normalizedProjectIds } },
        select: { userId: true },
        distinct: ['userId'],
      })
      const userIds = members.map((member) => member.userId)
      if (userIds.length === 0) {
        return []
      }
      where.userId = { in: userIds }
    }

    const grouped = await prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: filters?.limit ?? 5,
    })

    const valid = grouped.filter((row): row is { userId: string; _count: { userId: number } } => row.userId !== null)

    if (valid.length === 0) return []

    const users = await prisma.user.findMany({
      where: { id: { in: valid.map((row) => row.userId) } },
      select: { id: true, name: true, avatarUrl: true },
    })
    const userMap = new Map(users.map((user) => [user.id, user]))

    return valid
      .map((row) => {
        const user = userMap.get(row.userId)
        if (!user) return null
        return {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          actionCount: row._count.userId,
        }
      })
      .filter((row): row is DashboardActiveMember => row !== null)
  },

  async findMyTasks(userId: string) {
    return prisma.task.findMany({
      where: { assignedTo: userId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    })
  },

  async findMyReports(userId: string) {
    return prisma.dailyReport.findMany({
      where: { createdBy: userId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    })
  },

  countMyTodayReports(userId: string) {
    return this.countTodayReports(startOfDay(), { createdBy: userId })
  },

  getMyWeeklyProgress(userId: string) {
    return buildTaskWeeklyProgress(buildTaskFilterWhere({ assigneeId: userId }))
  },

  async getMyTasksByStatus(userId: string): Promise<Record<TaskStatus, number>> {
    const rows = await prisma.task.groupBy({
      by: ['status'],
      where: { assignedTo: userId },
      _count: { status: true },
    })
    return mapTaskStatusCounts(rows)
  },

  async getSafetyStatsByProjectIds(projectIds: string[]): Promise<SafetyDashboardStats> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) {
      return {
        totalReports: 0,
        pendingApprovals: 0,
        totalViolations: 0,
        recentViolations: [],
        thisWeekReports: 0,
        lastWeekReports: 0,
        violationRate: 0,
      }
    }

    const now = new Date()
    const thisWeekStart = startOfWeek(now)
    const lastWeekStart = addDays(thisWeekStart, -7)

    const [totalReports, pendingApprovals, aggregatedViolations, recentViolations, thisWeekReports, lastWeekReports] =
      await Promise.all([
        prisma.safetyReport.count({
          where: { projectId: { in: normalizedProjectIds } },
        }),
        prisma.safetyReport.count({
          where: { projectId: { in: normalizedProjectIds }, status: 'PENDING' },
        }),
        prisma.safetyReport.aggregate({
          where: { projectId: { in: normalizedProjectIds } },
          _sum: { violations: true },
        }),
        this.findRecentViolationsByProjectIds(normalizedProjectIds),
        prisma.safetyReport.count({
          where: {
            projectId: { in: normalizedProjectIds },
            reportDate: { gte: thisWeekStart },
          },
        }),
        prisma.safetyReport.count({
          where: {
            projectId: { in: normalizedProjectIds },
            reportDate: { gte: lastWeekStart, lt: thisWeekStart },
          },
        }),
      ])

    const totalViolations = aggregatedViolations._sum.violations ?? 0
    return {
      totalReports,
      pendingApprovals,
      totalViolations,
      recentViolations,
      thisWeekReports,
      lastWeekReports,
      violationRate: totalReports > 0 ? roundTo((totalViolations / totalReports) * 100, 2) : 0,
    }
  },

  countPendingSafetyApprovalsByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return Promise.resolve(0)
    return prisma.safetyReport.count({
      where: {
        projectId: { in: normalizedProjectIds },
        status: 'PENDING',
      },
    })
  },

  async findRecentViolationsByProjectIds(projectIds: string[]): Promise<SafetyViolation[]> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    const reports = await prisma.safetyReport.findMany({
      where: {
        projectId: { in: normalizedProjectIds },
        violations: { gt: 0 },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        reportDate: true,
        location: true,
        description: true,
        violations: true,
        status: true,
      },
    })

    return reports.map((report) => ({
      id: report.id,
      date: report.reportDate.toISOString(),
      location: report.location,
      description: report.description,
      severity: violationSeverity(report.violations),
      resolved: report.status === 'APPROVED',
    }))
  },

  async findSafetyTasksByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    return prisma.task.findMany({
      where: mergeTaskWhere(
        buildTaskFilterWhere({
          projectIds: normalizedProjectIds,
          tags: SAFETY_KEYWORDS,
        }),
        {
          status: { in: OPEN_TASK_STATUSES },
        },
      ),
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    })
  },

  getWeeklySafetyProgressByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) {
      return Promise.resolve<DashboardWeeklyProgress[]>([])
    }
    return buildReportWeeklyProgress('safetyReport', { projectId: { in: normalizedProjectIds } })
  },

  async getQualityStatsByProjectIds(projectIds: string[]): Promise<QualityDashboardStats> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) {
      return {
        totalReports: 0,
        pendingApprovals: 0,
        passRate: 0,
        thisWeekReports: 0,
        lastWeekReports: 0,
        recentReports: [],
      }
    }

    const now = new Date()
    const thisWeekStart = startOfWeek(now)
    const lastWeekStart = addDays(thisWeekStart, -7)

    const [totalReports, pendingApprovals, approvedReports, thisWeekReports, lastWeekReports, recentReports] =
      await Promise.all([
        prisma.qualityReport.count({
          where: { projectId: { in: normalizedProjectIds } },
        }),
        prisma.qualityReport.count({
          where: { projectId: { in: normalizedProjectIds }, status: 'PENDING' },
        }),
        prisma.qualityReport.count({
          where: { projectId: { in: normalizedProjectIds }, status: 'APPROVED' },
        }),
        prisma.qualityReport.count({
          where: {
            projectId: { in: normalizedProjectIds },
            reportDate: { gte: thisWeekStart },
          },
        }),
        prisma.qualityReport.count({
          where: {
            projectId: { in: normalizedProjectIds },
            reportDate: { gte: lastWeekStart, lt: thisWeekStart },
          },
        }),
        this.findRecentQualityReportsByProjectIds(normalizedProjectIds),
      ])

    return {
      totalReports,
      pendingApprovals,
      passRate: totalReports > 0 ? roundTo((approvedReports / totalReports) * 100, 2) : 0,
      thisWeekReports,
      lastWeekReports,
      recentReports: recentReports as unknown as QualityDashboardStats['recentReports'],
    }
  },

  countPendingQualityApprovalsByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return Promise.resolve(0)
    return prisma.qualityReport.count({
      where: {
        projectId: { in: normalizedProjectIds },
        status: 'PENDING',
      },
    })
  },

  async findRecentQualityReportsByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    return prisma.qualityReport.findMany({
      where: {
        projectId: { in: normalizedProjectIds },
      },
      include: {
        inspector: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    })
  },

  getWeeklyQualityProgressByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) {
      return Promise.resolve<DashboardWeeklyProgress[]>([])
    }
    return buildReportWeeklyProgress('qualityReport', { projectId: { in: normalizedProjectIds } })
  },

  async getWarehouseStatsByProjectIds(projectIds: string[]): Promise<WarehouseDashboardStats> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) {
      return {
        totalItems: 0,
        totalValue: 0,
        lowStockCount: 0,
        pendingRequests: 0,
        thisMonthIn: 0,
        thisMonthOut: 0,
      }
    }

    const monthStart = startOfMonth()

    const [items, pendingRequests, monthIn, monthOut] = await Promise.all([
      prisma.warehouseInventory.findMany({
        where: { projectId: { in: normalizedProjectIds } },
        select: {
          quantity: true,
          minQuantity: true,
        },
      }),
      prisma.warehouseTransaction.count({
        where: {
          inventory: { projectId: { in: normalizedProjectIds } },
          status: 'PENDING',
          type: 'REQUEST',
        },
      }),
      prisma.warehouseTransaction.aggregate({
        where: {
          inventory: { projectId: { in: normalizedProjectIds } },
          type: 'IN',
          status: 'APPROVED',
          createdAt: { gte: monthStart },
        },
        _sum: { quantity: true },
      }),
      prisma.warehouseTransaction.aggregate({
        where: {
          inventory: { projectId: { in: normalizedProjectIds } },
          type: 'OUT',
          status: 'APPROVED',
          createdAt: { gte: monthStart },
        },
        _sum: { quantity: true },
      }),
    ])

    const totalItems = items.length
    const totalValue = items.reduce((sum, item) => sum + decimalToNumber(item.quantity), 0)
    const lowStockCount = items.filter((item) => item.quantity.lte(item.minQuantity)).length

    return {
      totalItems,
      totalValue,
      lowStockCount,
      pendingRequests,
      thisMonthIn: decimalToNumber(monthIn._sum.quantity),
      thisMonthOut: decimalToNumber(monthOut._sum.quantity),
    }
  },

  async findLowStockItemsByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    const items = await prisma.warehouseInventory.findMany({
      where: {
        projectId: { in: normalizedProjectIds },
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return items.filter((item) => item.quantity.lte(item.minQuantity))
  },

  countPendingTransactionsByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return Promise.resolve(0)

    return prisma.warehouseTransaction.count({
      where: {
        inventory: { projectId: { in: normalizedProjectIds } },
        status: 'PENDING',
      },
    })
  },

  async findRecentTransactionsByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    return prisma.warehouseTransaction.findMany({
      where: {
        inventory: { projectId: { in: normalizedProjectIds } },
      },
      include: {
        inventory: {
          select: {
            id: true,
            materialName: true,
            unit: true,
            location: true,
          },
        },
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
    })
  },

  async getWarehouseTrendDataByProjectIds(projectIds: string[]): Promise<WarehouseTrendDataPoint[]> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    const items = await prisma.warehouseInventory.findMany({
      where: {
        projectId: { in: normalizedProjectIds },
      },
      select: {
        id: true,
        materialName: true,
        quantity: true,
        minQuantity: true,
        maxQuantity: true,
        unit: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 30,
    })

    return items.map((item) => ({
      date: isoDate(item.updatedAt),
      itemId: item.id,
      itemName: item.materialName,
      quantity: decimalToNumber(item.quantity),
      minQuantity: decimalToNumber(item.minQuantity),
      maxQuantity: decimalToNumber(item.maxQuantity),
      unit: item.unit,
    }))
  },

  async getProjectProgressByProjectIds(projectIds: string[]): Promise<ProjectProgressStats[]> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    const projects = await prisma.project.findMany({
      where: { id: { in: normalizedProjectIds } },
      select: {
        id: true,
        name: true,
        progress: true,
        startDate: true,
        endDate: true,
        status: true,
      },
      orderBy: [{ updatedAt: 'desc' }],
    })

    const today = startOfDay()
    return projects.map((project) => {
      const progress = decimalToNumber(project.progress)
      const endDate = project.endDate ?? project.startDate
      const daysRemaining = Math.max(0, Math.ceil((startOfDay(endDate).getTime() - today.getTime()) / 86400000))
      return {
        projectId: project.id,
        projectName: project.name,
        progress,
        startDate: project.startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysRemaining,
        status: project.status,
        completionRate: progress,
      }
    })
  },

  async findRecentReportsForClientByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    return prisma.dailyReport.findMany({
      where: {
        projectId: { in: normalizedProjectIds },
        status: 'SENT',
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    })
  },

  async getBudgetOverviewByProjectIds(projectIds: string[]): Promise<BudgetOverview[]> {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) return []

    const projects = await prisma.project.findMany({
      where: { id: { in: normalizedProjectIds } },
      select: {
        id: true,
        name: true,
        budgetItems: {
          select: {
            estimatedCost: true,
            approvedCost: true,
            spentCost: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    })

    return projects.map((project) => {
      const totals = project.budgetItems.reduce(
        (acc, item) => {
          const estimated = decimalToNumber(item.estimatedCost)
          const approved = item.approvedCost ? decimalToNumber(item.approvedCost) : decimalToNumber(item.estimatedCost)
          const spent = decimalToNumber(item.spentCost)
          acc.totalEstimated += estimated
          acc.totalApproved += approved
          acc.totalSpent += spent
          return acc
        },
        { totalEstimated: 0, totalApproved: 0, totalSpent: 0 },
      )

      const remaining = totals.totalApproved - totals.totalSpent
      return {
        projectId: project.id,
        projectName: project.name,
        totalEstimated: totals.totalEstimated,
        totalApproved: totals.totalApproved,
        totalSpent: totals.totalSpent,
        remaining,
        completionRate: totals.totalApproved > 0 ? roundTo((totals.totalSpent / totals.totalApproved) * 100, 2) : 0,
      }
    })
  },

  getWeeklyProgressByProjectIds(projectIds: string[]) {
    const normalizedProjectIds = normalizeProjectIds(projectIds) ?? []
    if (normalizedProjectIds.length === 0) {
      return Promise.resolve<DashboardWeeklyProgress[]>([])
    }
    return buildTaskWeeklyProgress(buildTaskFilterWhere({ projectIds: normalizedProjectIds }))
  },

  async getTaskStatusCounts(filters: TaskFilters = {}): Promise<Record<TaskStatus, number>> {
    const rows = await prisma.task.groupBy({
      by: ['status'],
      where: buildTaskFilterWhere(filters),
      _count: { status: true },
    })
    return mapTaskStatusCounts(rows)
  },
}

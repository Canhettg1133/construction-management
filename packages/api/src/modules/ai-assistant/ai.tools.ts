import { TOOL_LABELS, type ToolPermissionMap } from '@construction/shared'
import { prisma } from '../../config/database'
import { NotFoundError } from '../../shared/errors'
import { AI_SOURCE_TOOL_IDS, type AiContextSource, type AiOmittedTool, type AiSourceToolId } from './ai.context'
import { getAllowedAiSources, isAiSourceEnabled } from './ai.permissions'
import type { AiMessageIntent } from './ai.prompt'

export type AiToolName =
  | 'get_project_overview'
  | 'get_project_weekly_snapshot'
  | 'list_overdue_tasks'
  | 'list_tasks_due_soon'
  | 'list_tasks_by_status'
  | 'analyze_delay_causes'
  | 'list_recent_daily_reports'
  | 'summarize_daily_reports'
  | 'build_daily_report_draft_context'
  | 'list_low_stock_items'
  | 'get_material_usage_summary'
  | 'list_pending_warehouse_requests'
  | 'get_budget_summary'
  | 'list_over_budget_items'
  | 'list_pending_disbursements'
  | 'list_open_safety_issues'
  | 'summarize_recent_safety_reports'
  | 'suggest_safety_checklist'
  | 'list_open_quality_issues'
  | 'summarize_quality_reports'
  | 'suggest_quality_checklist'
  | 'list_project_files'
  | 'search_document_metadata'
  | 'summarize_uploaded_file_metadata'
  | 'get_today_attention_items'
  | 'analyze_project_risks'
  | 'summarize_project_health'

export type AiQuickPromptPreset =
  | 'WEEKLY_SUMMARY'
  | 'OVERDUE_TASKS'
  | 'SCHEDULE_RISK'
  | 'LOW_STOCK_CHECK'
  | 'SAFETY_QUALITY_SUMMARY'
  | 'DAILY_REPORT_DRAFT'

export interface AiToolCallMeta {
  name: AiToolName
  sourceToolIds: AiSourceToolId[]
  status: 'EXECUTED' | 'OMITTED'
  omittedReason?: 'NO_PERMISSION' | 'DISABLED'
}

export interface AiToolResultMeta {
  name: AiToolName
  sourceToolIds: AiSourceToolId[]
  output: unknown
  sourceRefs: AiContextSource[]
}

export interface AiToolGatewayContext {
  projectId: string
  generatedAt: string
  includedTools: AiSourceToolId[]
  omittedTools: AiOmittedTool[]
  sources: AiContextSource[]
  data: Record<string, unknown>
  toolCalls: AiToolCallMeta[]
  toolResults: AiToolResultMeta[]
}

export interface RunAiToolGatewayParams {
  projectId: string
  question: string
  intent: AiMessageIntent
  quickPromptPreset?: AiQuickPromptPreset | null
  permissions: ToolPermissionMap
  enabledSourceTools: AiSourceToolId[] | null
  maxContextItems?: number | null
  now?: Date
}

interface ToolExecutionContext extends RunAiToolGatewayParams {
  now: Date
  limit: number
  allowedSourceTools: Set<AiSourceToolId>
}

interface ToolExecutionResult {
  output: unknown
  sourceRefs: AiContextSource[]
  usedSourceToolIds?: AiSourceToolId[]
}

interface AiToolDefinition {
  name: AiToolName
  sourceToolIds: AiSourceToolId[]
  execute: (context: ToolExecutionContext) => Promise<ToolExecutionResult>
}

const DEFAULT_MAX_CONTEXT_ITEMS = 40
const MAX_CONTEXT_ITEMS_CAP = 100

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return value
  }
  return Number(value)
}

function toDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }
  return new Date(value).toISOString().slice(0, 10)
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }
  return new Date(value).toISOString()
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)))
}

function getLimit(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_MAX_CONTEXT_ITEMS
  }
  return Math.max(5, Math.min(Math.floor(value), MAX_CONTEXT_ITEMS_CAP))
}

function source(toolId: AiSourceToolId, recordType: string, recordId: string, title?: string): AiContextSource {
  return { toolId, recordType, recordId, title }
}

async function withAiSource<T>(
  context: ToolExecutionContext,
  sourceId: AiSourceToolId,
  loader: () => Promise<T>,
): Promise<T | null> {
  if (!context.allowedSourceTools.has(sourceId)) {
    return null
  }
  return loader()
}

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setHours(0, 0, 0, 0)
  result.setDate(result.getDate() + diff)
  return result
}

function endOfWeek(date: Date) {
  const result = startOfWeek(date)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function taskSelect() {
  return {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    dueDate: true,
    completedAt: true,
    approvalStatus: true,
    assignee: { select: { id: true, name: true } },
  } as const
}

function normalizeTask<T extends { dueDate?: Date | string | null; completedAt?: Date | string | null }>(task: T) {
  return {
    ...task,
    dueDate: toDateOnly(task.dueDate),
    completedAt: toIso(task.completedAt),
  }
}

function normalizeReport<T extends { reportDate: Date | string; progress?: unknown }>(report: T) {
  return {
    ...report,
    reportDate: toDateOnly(report.reportDate),
    progress: toNumber(report.progress),
  }
}

async function getProjectOrThrow(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      location: true,
      clientName: true,
      startDate: true,
      endDate: true,
      status: true,
      progress: true,
    },
  })

  if (!project) {
    throw new NotFoundError('Không tìm thấy dự án')
  }

  return {
    ...project,
    progress: toNumber(project.progress),
    startDate: toDateOnly(project.startDate),
    endDate: toDateOnly(project.endDate),
  }
}

function countBy<T extends string>(items: Array<{ status: T }>) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1
    return acc
  }, {})
}

const toolDefinitions: Record<AiToolName, AiToolDefinition> = {
  get_project_overview: {
    name: 'get_project_overview',
    sourceToolIds: ['PROJECT'],
    execute: async (context) => {
      const project = await getProjectOrThrow(context.projectId)
      return {
        output: project,
        sourceRefs: [source('PROJECT', 'Dự án', project.id, project.name)],
      }
    },
  },

  get_project_weekly_snapshot: {
    name: 'get_project_weekly_snapshot',
    sourceToolIds: ['PROJECT', 'TASK', 'DAILY_REPORT'],
    execute: async (context) => {
      const weekStart = startOfWeek(context.now)
      const weekEnd = endOfWeek(context.now)
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {
        weekStart: toDateOnly(weekStart),
        weekEnd: toDateOnly(weekEnd),
      }
      const usedSourceToolIds: AiSourceToolId[] = []

      const project = await withAiSource(context, 'PROJECT', () => getProjectOrThrow(context.projectId))
      if (project) {
        output.project = project
        sourceRefs.push(source('PROJECT', 'Dự án', project.id, project.name))
        usedSourceToolIds.push('PROJECT')
      }

      const tasks = await withAiSource(context, 'TASK', () =>
        prisma.task.findMany({
          where: {
            projectId: context.projectId,
            OR: [{ dueDate: { gte: weekStart, lte: weekEnd } }, { status: { in: ['TO_DO', 'IN_PROGRESS'] } }],
          },
          orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
          take: context.limit,
          select: taskSelect(),
        }),
      )
      if (tasks) {
        output.tasks = tasks.map(normalizeTask)
        tasks.forEach((task) => sourceRefs.push(source('TASK', 'Công việc', task.id, task.title)))
        usedSourceToolIds.push('TASK')
      }

      const reports = await withAiSource(context, 'DAILY_REPORT', () =>
        prisma.dailyReport.findMany({
          where: { projectId: context.projectId, reportDate: { gte: weekStart, lte: weekEnd } },
          orderBy: { reportDate: 'desc' },
          take: Math.min(context.limit, 14),
          select: {
            id: true,
            reportDate: true,
            weather: true,
            workerCount: true,
            workDescription: true,
            issues: true,
            progress: true,
            notes: true,
            status: true,
            approvalStatus: true,
            creator: { select: { id: true, name: true } },
          },
        }),
      )
      if (reports) {
        output.dailyReports = reports.map(normalizeReport)
        reports.forEach((report) =>
          sourceRefs.push(
            source('DAILY_REPORT', 'Báo cáo ngày', report.id, `Báo cáo ngày ${toDateOnly(report.reportDate)}`),
          ),
        )
        usedSourceToolIds.push('DAILY_REPORT')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  list_overdue_tasks: {
    name: 'list_overdue_tasks',
    sourceToolIds: ['TASK'],
    execute: async (context) => {
      const today = new Date(context.now)
      today.setHours(0, 0, 0, 0)
      const tasks = await prisma.task.findMany({
        where: {
          projectId: context.projectId,
          dueDate: { lt: today },
          status: { in: ['TO_DO', 'IN_PROGRESS'] },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: context.limit,
        select: taskSelect(),
      })
      return {
        output: { total: tasks.length, tasks: tasks.map(normalizeTask) },
        sourceRefs: tasks.map((task) => source('TASK', 'Công việc', task.id, task.title)),
      }
    },
  },

  list_tasks_due_soon: {
    name: 'list_tasks_due_soon',
    sourceToolIds: ['TASK'],
    execute: async (context) => {
      const today = new Date(context.now)
      today.setHours(0, 0, 0, 0)
      const soon = addDays(today, 7)
      const tasks = await prisma.task.findMany({
        where: {
          projectId: context.projectId,
          dueDate: { gte: today, lte: soon },
          status: { in: ['TO_DO', 'IN_PROGRESS'] },
        },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        take: context.limit,
        select: taskSelect(),
      })
      return {
        output: { from: toDateOnly(today), to: toDateOnly(soon), total: tasks.length, tasks: tasks.map(normalizeTask) },
        sourceRefs: tasks.map((task) => source('TASK', 'Công việc', task.id, task.title)),
      }
    },
  },

  list_tasks_by_status: {
    name: 'list_tasks_by_status',
    sourceToolIds: ['TASK'],
    execute: async (context) => {
      const tasks = await prisma.task.findMany({
        where: { projectId: context.projectId },
        orderBy: [{ updatedAt: 'desc' }],
        take: context.limit,
        select: taskSelect(),
      })
      return {
        output: { counts: countBy(tasks), recentTasks: tasks.map(normalizeTask) },
        sourceRefs: tasks.map((task) => source('TASK', 'Công việc', task.id, task.title)),
      }
    },
  },

  analyze_delay_causes: {
    name: 'analyze_delay_causes',
    sourceToolIds: ['TASK', 'DAILY_REPORT'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []
      const today = new Date(context.now)
      today.setHours(0, 0, 0, 0)

      const overdueTasks = await withAiSource(context, 'TASK', () =>
        prisma.task.findMany({
          where: {
            projectId: context.projectId,
            dueDate: { lt: today },
            status: { in: ['TO_DO', 'IN_PROGRESS'] },
          },
          orderBy: [{ dueDate: 'asc' }],
          take: Math.min(context.limit, 20),
          select: taskSelect(),
        }),
      )
      if (overdueTasks) {
        output.overdueTasks = overdueTasks.map(normalizeTask)
        overdueTasks.forEach((task) => sourceRefs.push(source('TASK', 'Công việc', task.id, task.title)))
        usedSourceToolIds.push('TASK')
      }

      const reportsWithIssues = await withAiSource(context, 'DAILY_REPORT', () =>
        prisma.dailyReport.findMany({
          where: { projectId: context.projectId, issues: { not: null } },
          orderBy: { reportDate: 'desc' },
          take: Math.min(context.limit, 14),
          select: {
            id: true,
            reportDate: true,
            issues: true,
            workDescription: true,
            progress: true,
            creator: { select: { id: true, name: true } },
          },
        }),
      )
      if (reportsWithIssues) {
        output.reportsWithIssues = reportsWithIssues.map((report) => ({
          ...report,
          reportDate: toDateOnly(report.reportDate),
          progress: toNumber(report.progress),
        }))
        reportsWithIssues.forEach((report) =>
          sourceRefs.push(
            source('DAILY_REPORT', 'Báo cáo ngày', report.id, `Báo cáo ngày ${toDateOnly(report.reportDate)}`),
          ),
        )
        usedSourceToolIds.push('DAILY_REPORT')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  list_recent_daily_reports: {
    name: 'list_recent_daily_reports',
    sourceToolIds: ['DAILY_REPORT'],
    execute: async (context) => {
      const reports = await prisma.dailyReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: Math.min(context.limit, 14),
        select: {
          id: true,
          reportDate: true,
          weather: true,
          workerCount: true,
          workDescription: true,
          issues: true,
          progress: true,
          notes: true,
          status: true,
          approvalStatus: true,
          creator: { select: { id: true, name: true } },
        },
      })
      return {
        output: { total: reports.length, reports: reports.map(normalizeReport) },
        sourceRefs: reports.map((report) =>
          source('DAILY_REPORT', 'Báo cáo ngày', report.id, `Báo cáo ngày ${toDateOnly(report.reportDate)}`),
        ),
      }
    },
  },

  summarize_daily_reports: {
    name: 'summarize_daily_reports',
    sourceToolIds: ['DAILY_REPORT'],
    execute: async (context) => {
      const reports = await prisma.dailyReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: Math.min(context.limit, 14),
        select: {
          id: true,
          reportDate: true,
          workerCount: true,
          progress: true,
          issues: true,
          workDescription: true,
          approvalStatus: true,
        },
      })
      const normalized = reports.map((report) => ({
        ...report,
        reportDate: toDateOnly(report.reportDate),
        progress: toNumber(report.progress),
      }))
      return {
        output: {
          reportCount: reports.length,
          latestProgress: normalized[0]?.progress ?? null,
          totalWorkerCount: reports.reduce((sum, report) => sum + report.workerCount, 0),
          reportsWithIssues: normalized.filter((report) => Boolean(report.issues)),
          reports: normalized,
        },
        sourceRefs: reports.map((report) =>
          source('DAILY_REPORT', 'Báo cáo ngày', report.id, `Báo cáo ngày ${toDateOnly(report.reportDate)}`),
        ),
      }
    },
  },

  build_daily_report_draft_context: {
    name: 'build_daily_report_draft_context',
    sourceToolIds: ['PROJECT', 'TASK', 'DAILY_REPORT', 'SAFETY', 'QUALITY', 'WAREHOUSE'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []

      const project = await withAiSource(context, 'PROJECT', () => getProjectOrThrow(context.projectId))
      if (project) {
        output.project = project
        sourceRefs.push(source('PROJECT', 'Dự án', project.id, project.name))
        usedSourceToolIds.push('PROJECT')
      }

      const openTasks = await withAiSource(context, 'TASK', () =>
        prisma.task.findMany({
          where: { projectId: context.projectId, status: { in: ['TO_DO', 'IN_PROGRESS'] } },
          orderBy: [{ dueDate: 'asc' }],
          take: Math.min(context.limit, 20),
          select: taskSelect(),
        }),
      )
      if (openTasks) {
        output.openTasks = openTasks.map(normalizeTask)
        openTasks.forEach((task) => sourceRefs.push(source('TASK', 'Công việc', task.id, task.title)))
        usedSourceToolIds.push('TASK')
      }

      const recentReports = await withAiSource(context, 'DAILY_REPORT', () =>
        prisma.dailyReport.findMany({
          where: { projectId: context.projectId },
          orderBy: { reportDate: 'desc' },
          take: 5,
          select: {
            id: true,
            reportDate: true,
            workerCount: true,
            workDescription: true,
            issues: true,
            progress: true,
          },
        }),
      )
      if (recentReports) {
        output.recentReports = recentReports.map((report) => ({
          ...report,
          reportDate: toDateOnly(report.reportDate),
          progress: toNumber(report.progress),
        }))
        recentReports.forEach((report) =>
          sourceRefs.push(
            source('DAILY_REPORT', 'Báo cáo ngày', report.id, `Báo cáo ngày ${toDateOnly(report.reportDate)}`),
          ),
        )
        usedSourceToolIds.push('DAILY_REPORT')
      }

      const inventory = await withAiSource(context, 'WAREHOUSE', () =>
        prisma.warehouseInventory.findMany({
          where: { projectId: context.projectId },
          orderBy: { updatedAt: 'desc' },
          take: Math.min(context.limit, 20),
          select: {
            id: true,
            materialName: true,
            unit: true,
            quantity: true,
            minQuantity: true,
            maxQuantity: true,
            location: true,
            updatedAt: true,
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              select: { id: true, type: true, quantity: true, status: true, note: true, createdAt: true },
            },
          },
        }),
      )
      if (inventory) {
        const warehouseInventory = inventory.map((item) => {
          const quantity = Number(item.quantity)
          const minQuantity = Number(item.minQuantity)
          return {
            ...item,
            quantity,
            minQuantity,
            maxQuantity: toNumber(item.maxQuantity),
            updatedAt: toIso(item.updatedAt),
            isLowStock: quantity <= minQuantity,
            transactions: item.transactions.map((transaction) => ({
              ...transaction,
              quantity: toNumber(transaction.quantity),
              createdAt: toIso(transaction.createdAt),
            })),
          }
        })
        output.warehouseInventory = warehouseInventory
        output.lowStockItems = warehouseInventory.filter((item) => item.isLowStock)
        inventory.forEach((item) => sourceRefs.push(source('WAREHOUSE', 'Tồn kho', item.id, item.materialName)))
        usedSourceToolIds.push('WAREHOUSE')
      }

      const safetyReports = await withAiSource(context, 'SAFETY', () =>
        prisma.safetyReport.findMany({
          where: { projectId: context.projectId },
          orderBy: { reportDate: 'desc' },
          take: 5,
          select: {
            id: true,
            reportDate: true,
            location: true,
            description: true,
            violations: true,
            status: true,
            checklistItems: { select: { id: true, label: true, checked: true, note: true } },
            incident: { select: { id: true, severity: true, status: true, immediateAction: true } },
            nearMiss: { select: { id: true, likelihood: true, severity: true, status: true, description: true } },
          },
        }),
      )
      if (safetyReports) {
        const recentSafetyReports = safetyReports.map((report) => ({
          ...report,
          reportDate: toDateOnly(report.reportDate),
        }))
        output.recentSafetyReports = recentSafetyReports
        output.openSafetyIssues = recentSafetyReports.filter(
          (report) =>
            report.violations > 0 ||
            Boolean(report.incident && report.incident.status !== 'CLOSED') ||
            Boolean(report.nearMiss && report.nearMiss.status !== 'RESOLVED') ||
            report.checklistItems.some((item) => !item.checked),
        )
        safetyReports.forEach((report) =>
          sourceRefs.push(
            source(
              'SAFETY',
              'Báo cáo an toàn',
              report.id,
              `An toàn ${toDateOnly(report.reportDate)} - ${report.location}`,
            ),
          ),
        )
        usedSourceToolIds.push('SAFETY')
      }

      const qualityReports = await withAiSource(context, 'QUALITY', () =>
        prisma.qualityReport.findMany({
          where: { projectId: context.projectId },
          orderBy: { reportDate: 'desc' },
          take: 5,
          select: {
            id: true,
            reportDate: true,
            location: true,
            description: true,
            status: true,
            result: true,
            notes: true,
            punchListItems: {
              where: { status: { in: ['OPEN', 'REJECTED'] } },
              select: { id: true, title: true, severity: true, status: true, location: true },
            },
          },
        }),
      )
      if (qualityReports) {
        const recentQualityReports = qualityReports.map((report) => ({
          ...report,
          reportDate: toDateOnly(report.reportDate),
        }))
        output.recentQualityReports = recentQualityReports
        output.openQualityIssues = recentQualityReports.filter(
          (report) => Boolean(report.result && report.result !== 'PASS') || report.punchListItems.length > 0,
        )
        qualityReports.forEach((report) =>
          sourceRefs.push(
            source(
              'QUALITY',
              'Báo cáo chất lượng',
              report.id,
              `Chất lượng ${toDateOnly(report.reportDate)} - ${report.location}`,
            ),
          ),
        )
        usedSourceToolIds.push('QUALITY')
      }

      output.equipmentData = {
        available: false,
        reason: 'Hệ thống chưa cung cấp phân hệ máy móc/thiết bị riêng trong ngữ cảnh AI.',
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  list_low_stock_items: {
    name: 'list_low_stock_items',
    sourceToolIds: ['WAREHOUSE'],
    execute: async (context) => {
      const items = await prisma.warehouseInventory.findMany({
        where: { projectId: context.projectId },
        orderBy: { updatedAt: 'desc' },
        take: context.limit,
        select: {
          id: true,
          materialName: true,
          unit: true,
          quantity: true,
          minQuantity: true,
          maxQuantity: true,
          location: true,
          updatedAt: true,
        },
      })
      const lowStockItems = items
        .filter((item) => Number(item.quantity) <= Number(item.minQuantity))
        .map((item) => ({
          ...item,
          quantity: toNumber(item.quantity),
          minQuantity: toNumber(item.minQuantity),
          maxQuantity: toNumber(item.maxQuantity),
          updatedAt: toIso(item.updatedAt),
        }))
      return {
        output: { total: lowStockItems.length, items: lowStockItems },
        sourceRefs: lowStockItems.map((item) => source('WAREHOUSE', 'Tồn kho', item.id, item.materialName)),
      }
    },
  },

  get_material_usage_summary: {
    name: 'get_material_usage_summary',
    sourceToolIds: ['WAREHOUSE'],
    execute: async (context) => {
      const items = await prisma.warehouseInventory.findMany({
        where: { projectId: context.projectId },
        orderBy: { updatedAt: 'desc' },
        take: Math.min(context.limit, 30),
        select: {
          id: true,
          materialName: true,
          unit: true,
          quantity: true,
          minQuantity: true,
          location: true,
          updatedAt: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, type: true, quantity: true, status: true, note: true, createdAt: true },
          },
        },
      })
      return {
        output: {
          items: items.map((item) => ({
            ...item,
            quantity: toNumber(item.quantity),
            minQuantity: toNumber(item.minQuantity),
            updatedAt: toIso(item.updatedAt),
            transactions: item.transactions.map((transaction) => ({
              ...transaction,
              quantity: toNumber(transaction.quantity),
              createdAt: toIso(transaction.createdAt),
            })),
          })),
        },
        sourceRefs: items.map((item) => source('WAREHOUSE', 'Tồn kho', item.id, item.materialName)),
      }
    },
  },

  list_pending_warehouse_requests: {
    name: 'list_pending_warehouse_requests',
    sourceToolIds: ['WAREHOUSE'],
    execute: async (context) => {
      const transactions = await prisma.warehouseTransaction.findMany({
        where: { status: 'PENDING', inventory: { projectId: context.projectId } },
        orderBy: { createdAt: 'desc' },
        take: context.limit,
        select: {
          id: true,
          type: true,
          quantity: true,
          note: true,
          status: true,
          createdAt: true,
          inventory: { select: { id: true, materialName: true, unit: true } },
          requester: { select: { id: true, name: true } },
        },
      })
      return {
        output: {
          total: transactions.length,
          requests: transactions.map((transaction) => ({
            ...transaction,
            quantity: toNumber(transaction.quantity),
            createdAt: toIso(transaction.createdAt),
          })),
        },
        sourceRefs: transactions.map((transaction) =>
          source('WAREHOUSE', 'Giao dịch kho', transaction.id, transaction.inventory.materialName),
        ),
      }
    },
  },

  get_budget_summary: {
    name: 'get_budget_summary',
    sourceToolIds: ['BUDGET'],
    execute: async (context) => {
      const items = await prisma.budgetItem.findMany({
        where: { projectId: context.projectId },
        orderBy: { updatedAt: 'desc' },
        take: context.limit,
        select: {
          id: true,
          category: true,
          description: true,
          estimatedCost: true,
          approvedCost: true,
          spentCost: true,
          status: true,
          updatedAt: true,
        },
      })
      const normalized = items.map((item) => ({
        ...item,
        estimatedCost: toNumber(item.estimatedCost),
        approvedCost: toNumber(item.approvedCost),
        spentCost: toNumber(item.spentCost),
        updatedAt: toIso(item.updatedAt),
      }))
      return {
        output: {
          itemCount: items.length,
          estimatedCostTotal: items.reduce((sum, item) => sum + Number(item.estimatedCost), 0),
          approvedCostTotal: items.reduce((sum, item) => sum + Number(item.approvedCost ?? 0), 0),
          spentCostTotal: items.reduce((sum, item) => sum + Number(item.spentCost), 0),
          items: normalized,
        },
        sourceRefs: items.map((item) =>
          source('BUDGET', 'Hạng mục ngân sách', item.id, `${TOOL_LABELS.BUDGET}: ${item.category}`),
        ),
      }
    },
  },

  list_over_budget_items: {
    name: 'list_over_budget_items',
    sourceToolIds: ['BUDGET'],
    execute: async (context) => {
      const items = await prisma.budgetItem.findMany({
        where: { projectId: context.projectId },
        orderBy: { updatedAt: 'desc' },
        take: context.limit,
        select: {
          id: true,
          category: true,
          description: true,
          estimatedCost: true,
          approvedCost: true,
          spentCost: true,
          status: true,
          updatedAt: true,
        },
      })
      const overBudget = items
        .filter((item) => Number(item.spentCost) > Number(item.approvedCost ?? item.estimatedCost))
        .map((item) => ({
          ...item,
          estimatedCost: toNumber(item.estimatedCost),
          approvedCost: toNumber(item.approvedCost),
          spentCost: toNumber(item.spentCost),
          updatedAt: toIso(item.updatedAt),
        }))
      return {
        output: { total: overBudget.length, items: overBudget },
        sourceRefs: overBudget.map((item) =>
          source('BUDGET', 'Hạng mục ngân sách', item.id, `${TOOL_LABELS.BUDGET}: ${item.category}`),
        ),
      }
    },
  },

  list_pending_disbursements: {
    name: 'list_pending_disbursements',
    sourceToolIds: ['BUDGET'],
    execute: async (context) => {
      const disbursements = await prisma.budgetDisbursement.findMany({
        where: { status: 'PENDING', budgetItem: { projectId: context.projectId } },
        orderBy: { createdAt: 'desc' },
        take: context.limit,
        select: {
          id: true,
          amount: true,
          status: true,
          note: true,
          createdAt: true,
          budgetItem: { select: { id: true, category: true, description: true } },
        },
      })
      return {
        output: {
          total: disbursements.length,
          disbursements: disbursements.map((item) => ({
            ...item,
            amount: toNumber(item.amount),
            createdAt: toIso(item.createdAt),
          })),
        },
        sourceRefs: disbursements.map((item) => source('BUDGET', 'Giải ngân', item.id, item.budgetItem.category)),
      }
    },
  },

  list_open_safety_issues: {
    name: 'list_open_safety_issues',
    sourceToolIds: ['SAFETY'],
    execute: async (context) => {
      const reports = await prisma.safetyReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: context.limit,
        select: {
          id: true,
          reportDate: true,
          location: true,
          description: true,
          violations: true,
          status: true,
          inspector: { select: { id: true, name: true } },
          incident: { select: { id: true, severity: true, status: true, immediateAction: true } },
          nearMiss: { select: { id: true, likelihood: true, severity: true, status: true, description: true } },
        },
      })
      const openReports = reports
        .filter(
          (report) =>
            report.violations > 0 ||
            Boolean(report.incident && report.incident.status !== 'CLOSED') ||
            Boolean(report.nearMiss && report.nearMiss.status !== 'RESOLVED'),
        )
        .map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) }))
      return {
        output: { total: openReports.length, issues: openReports },
        sourceRefs: openReports.map((report) =>
          source('SAFETY', 'Báo cáo an toàn', report.id, `An toàn ${report.reportDate} - ${report.location}`),
        ),
      }
    },
  },

  summarize_recent_safety_reports: {
    name: 'summarize_recent_safety_reports',
    sourceToolIds: ['SAFETY'],
    execute: async (context) => {
      const reports = await prisma.safetyReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: Math.min(context.limit, 12),
        select: {
          id: true,
          reportDate: true,
          location: true,
          description: true,
          violations: true,
          status: true,
          inspector: { select: { id: true, name: true } },
          checklistItems: { select: { id: true, label: true, checked: true, note: true } },
          incident: { select: { id: true, severity: true, status: true, immediateAction: true } },
          nearMiss: { select: { id: true, likelihood: true, severity: true, status: true, description: true } },
        },
      })
      return {
        output: {
          total: reports.length,
          totalViolations: reports.reduce((sum, report) => sum + report.violations, 0),
          reports: reports.map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) })),
        },
        sourceRefs: reports.map((report) =>
          source(
            'SAFETY',
            'Báo cáo an toàn',
            report.id,
            `An toàn ${toDateOnly(report.reportDate)} - ${report.location}`,
          ),
        ),
      }
    },
  },

  suggest_safety_checklist: {
    name: 'suggest_safety_checklist',
    sourceToolIds: ['SAFETY'],
    execute: async (context) => {
      const reports = await prisma.safetyReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: 8,
        select: {
          id: true,
          reportDate: true,
          location: true,
          violations: true,
          incident: { select: { id: true, severity: true, status: true } },
          nearMiss: { select: { id: true, severity: true, status: true } },
        },
      })
      return {
        output: {
          basis: reports.map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) })),
          suggestedItems: [
            'Kiểm tra PPE và lối đi an toàn tại khu vực thi công',
            'Rà soát biện pháp thi công trên cao và che chắn mép sàn',
            'Kiểm tra biển báo, rào chắn và nhật ký toolbox meeting',
            'Xác nhận sự cố/near miss còn mở đã có hành động khắc phục',
          ],
        },
        sourceRefs: reports.map((report) =>
          source(
            'SAFETY',
            'Báo cáo an toàn',
            report.id,
            `An toàn ${toDateOnly(report.reportDate)} - ${report.location}`,
          ),
        ),
      }
    },
  },

  list_open_quality_issues: {
    name: 'list_open_quality_issues',
    sourceToolIds: ['QUALITY'],
    execute: async (context) => {
      const reports = await prisma.qualityReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: context.limit,
        select: {
          id: true,
          reportDate: true,
          location: true,
          description: true,
          status: true,
          result: true,
          notes: true,
          inspector: { select: { id: true, name: true } },
          punchListItems: {
            where: { status: { in: ['OPEN', 'REJECTED'] } },
            select: { id: true, title: true, description: true, severity: true, status: true, location: true },
          },
        },
      })
      const reportsWithOpenItems = reports
        .filter((report) => report.result !== 'PASS' || report.punchListItems.length > 0)
        .map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) }))
      return {
        output: { total: reportsWithOpenItems.length, issues: reportsWithOpenItems },
        sourceRefs: reportsWithOpenItems.map((report) =>
          source('QUALITY', 'Báo cáo chất lượng', report.id, `Chất lượng ${report.reportDate} - ${report.location}`),
        ),
      }
    },
  },

  summarize_quality_reports: {
    name: 'summarize_quality_reports',
    sourceToolIds: ['QUALITY'],
    execute: async (context) => {
      const reports = await prisma.qualityReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: Math.min(context.limit, 12),
        select: {
          id: true,
          reportDate: true,
          location: true,
          description: true,
          status: true,
          result: true,
          notes: true,
          inspector: { select: { id: true, name: true } },
          punchListItems: {
            select: { id: true, title: true, severity: true, status: true, location: true },
          },
        },
      })
      return {
        output: {
          total: reports.length,
          byResult: reports.reduce<Record<string, number>>((acc, report) => {
            const key = report.result ?? 'UNKNOWN'
            acc[key] = (acc[key] ?? 0) + 1
            return acc
          }, {}),
          reports: reports.map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) })),
        },
        sourceRefs: reports.map((report) =>
          source(
            'QUALITY',
            'Báo cáo chất lượng',
            report.id,
            `Chất lượng ${toDateOnly(report.reportDate)} - ${report.location}`,
          ),
        ),
      }
    },
  },

  suggest_quality_checklist: {
    name: 'suggest_quality_checklist',
    sourceToolIds: ['QUALITY'],
    execute: async (context) => {
      const reports = await prisma.qualityReport.findMany({
        where: { projectId: context.projectId },
        orderBy: { reportDate: 'desc' },
        take: 8,
        select: {
          id: true,
          reportDate: true,
          location: true,
          result: true,
          punchListItems: { select: { id: true, title: true, severity: true, status: true } },
        },
      })
      return {
        output: {
          basis: reports.map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) })),
          suggestedItems: [
            'Kiểm tra vật liệu đầu vào và chứng chỉ chất lượng',
            'Đối chiếu bản vẽ/biện pháp thi công trước nghiệm thu',
            'Rà soát punch list còn mở và bằng chứng khắc phục',
            'Kiểm tra ảnh trước/sau tại các vị trí đã sửa lỗi',
          ],
        },
        sourceRefs: reports.map((report) =>
          source(
            'QUALITY',
            'Báo cáo chất lượng',
            report.id,
            `Chất lượng ${toDateOnly(report.reportDate)} - ${report.location}`,
          ),
        ),
      }
    },
  },

  list_project_files: {
    name: 'list_project_files',
    sourceToolIds: ['FILE'],
    execute: async (context) => {
      const files = await prisma.projectFile.findMany({
        where: { projectId: context.projectId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: context.limit,
        select: {
          id: true,
          originalName: true,
          fileType: true,
          mimeType: true,
          fileSize: true,
          version: true,
          tags: true,
          createdAt: true,
          uploader: { select: { id: true, name: true } },
        },
      })
      return {
        output: { total: files.length, files: files.map((file) => ({ ...file, createdAt: toIso(file.createdAt) })) },
        sourceRefs: files.map((file) => source('FILE', 'Tệp dự án', file.id, file.originalName)),
      }
    },
  },

  search_document_metadata: {
    name: 'search_document_metadata',
    sourceToolIds: ['DOCUMENT', 'FILE'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []
      const normalizedQuestion = normalizeText(context.question)
      const terms = normalizedQuestion
        .split(/\s+/u)
        .filter((term) => term.length >= 3)
        .slice(0, 8)

      const folders = await withAiSource(context, 'DOCUMENT', () =>
        prisma.documentFolder.findMany({
          where: { projectId: context.projectId },
          orderBy: { createdAt: 'desc' },
          take: context.limit,
          select: {
            id: true,
            name: true,
            parentId: true,
            createdAt: true,
            creator: { select: { id: true, name: true } },
          },
        }),
      )
      if (folders) {
        output.folders = folders
          .filter((folder) => terms.length === 0 || terms.some((term) => normalizeText(folder.name).includes(term)))
          .map((folder) => ({ ...folder, createdAt: toIso(folder.createdAt) }))
        folders.forEach((folder) => sourceRefs.push(source('DOCUMENT', 'Thư mục tài liệu', folder.id, folder.name)))
        usedSourceToolIds.push('DOCUMENT')
      }

      const files = await withAiSource(context, 'FILE', () =>
        prisma.projectFile.findMany({
          where: { projectId: context.projectId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: context.limit,
          select: {
            id: true,
            originalName: true,
            fileType: true,
            mimeType: true,
            tags: true,
            createdAt: true,
          },
        }),
      )
      if (files) {
        output.files = files
          .filter((file) => {
            const haystack = normalizeText(`${file.originalName} ${file.fileType} ${file.tags ?? ''}`)
            return terms.length === 0 || terms.some((term) => haystack.includes(term))
          })
          .map((file) => ({ ...file, createdAt: toIso(file.createdAt) }))
        files.forEach((file) => sourceRefs.push(source('FILE', 'Tệp dự án', file.id, file.originalName)))
        usedSourceToolIds.push('FILE')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  summarize_uploaded_file_metadata: {
    name: 'summarize_uploaded_file_metadata',
    sourceToolIds: ['FILE', 'DOCUMENT'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []

      const files = await withAiSource(context, 'FILE', () =>
        prisma.projectFile.findMany({
          where: { projectId: context.projectId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: context.limit,
          select: {
            id: true,
            originalName: true,
            fileType: true,
            mimeType: true,
            fileSize: true,
            version: true,
            tags: true,
            createdAt: true,
          },
        }),
      )
      if (files) {
        output.files = files.map((file) => ({ ...file, createdAt: toIso(file.createdAt) }))
        output.fileCount = files.length
        output.totalFileSize = files.reduce((sum, file) => sum + file.fileSize, 0)
        files.forEach((file) => sourceRefs.push(source('FILE', 'Tệp dự án', file.id, file.originalName)))
        usedSourceToolIds.push('FILE')
      }

      const folders = await withAiSource(context, 'DOCUMENT', () =>
        prisma.documentFolder.findMany({
          where: { projectId: context.projectId },
          orderBy: { createdAt: 'desc' },
          take: context.limit,
          select: { id: true, name: true, parentId: true, createdAt: true },
        }),
      )
      if (folders) {
        output.folderCount = folders.length
        output.folders = folders.map((folder) => ({ ...folder, createdAt: toIso(folder.createdAt) }))
        folders.forEach((folder) => sourceRefs.push(source('DOCUMENT', 'Thư mục tài liệu', folder.id, folder.name)))
        usedSourceToolIds.push('DOCUMENT')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  get_today_attention_items: {
    name: 'get_today_attention_items',
    sourceToolIds: ['TASK', 'WAREHOUSE', 'SAFETY', 'QUALITY', 'BUDGET'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []
      const today = new Date(context.now)
      today.setHours(0, 0, 0, 0)

      const overdueTasks = await withAiSource(context, 'TASK', () =>
        prisma.task.findMany({
          where: { projectId: context.projectId, dueDate: { lt: today }, status: { in: ['TO_DO', 'IN_PROGRESS'] } },
          orderBy: { dueDate: 'asc' },
          take: 10,
          select: taskSelect(),
        }),
      )
      if (overdueTasks) {
        output.overdueTasks = overdueTasks.map(normalizeTask)
        overdueTasks.forEach((task) => sourceRefs.push(source('TASK', 'Công việc', task.id, task.title)))
        usedSourceToolIds.push('TASK')
      }

      const inventory = await withAiSource(context, 'WAREHOUSE', () =>
        prisma.warehouseInventory.findMany({
          where: { projectId: context.projectId },
          orderBy: { updatedAt: 'desc' },
          take: context.limit,
          select: { id: true, materialName: true, unit: true, quantity: true, minQuantity: true, location: true },
        }),
      )
      if (inventory) {
        const lowStockItems = inventory
          .filter((item) => Number(item.quantity) <= Number(item.minQuantity))
          .slice(0, 10)
          .map((item) => ({
            ...item,
            quantity: toNumber(item.quantity),
            minQuantity: toNumber(item.minQuantity),
          }))
        output.lowStockItems = lowStockItems
        lowStockItems.forEach((item) => sourceRefs.push(source('WAREHOUSE', 'Tồn kho', item.id, item.materialName)))
        usedSourceToolIds.push('WAREHOUSE')
      }

      const pendingDisbursements = await withAiSource(context, 'BUDGET', () =>
        prisma.budgetDisbursement.findMany({
          where: { status: 'PENDING', budgetItem: { projectId: context.projectId } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, amount: true, status: true, createdAt: true, budgetItem: { select: { category: true } } },
        }),
      )
      if (pendingDisbursements) {
        output.pendingDisbursements = pendingDisbursements.map((item) => ({
          ...item,
          amount: toNumber(item.amount),
          createdAt: toIso(item.createdAt),
        }))
        pendingDisbursements.forEach((item) =>
          sourceRefs.push(source('BUDGET', 'Giải ngân', item.id, item.budgetItem.category)),
        )
        usedSourceToolIds.push('BUDGET')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  analyze_project_risks: {
    name: 'analyze_project_risks',
    sourceToolIds: ['PROJECT', 'TASK', 'WAREHOUSE', 'SAFETY', 'QUALITY', 'BUDGET'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []
      const today = new Date(context.now)
      today.setHours(0, 0, 0, 0)

      const project = await withAiSource(context, 'PROJECT', () => getProjectOrThrow(context.projectId))
      if (project) {
        output.project = project
        sourceRefs.push(source('PROJECT', 'Dự án', project.id, project.name))
        usedSourceToolIds.push('PROJECT')
      }

      const overdueTasks = await withAiSource(context, 'TASK', () =>
        prisma.task.findMany({
          where: { projectId: context.projectId, dueDate: { lt: today }, status: { in: ['TO_DO', 'IN_PROGRESS'] } },
          orderBy: { dueDate: 'asc' },
          take: 15,
          select: taskSelect(),
        }),
      )
      if (overdueTasks) {
        output.scheduleRisks = overdueTasks.map(normalizeTask)
        overdueTasks.forEach((task) => sourceRefs.push(source('TASK', 'Công việc', task.id, task.title)))
        usedSourceToolIds.push('TASK')
      }

      const inventory = await withAiSource(context, 'WAREHOUSE', () =>
        prisma.warehouseInventory.findMany({
          where: { projectId: context.projectId },
          orderBy: { updatedAt: 'desc' },
          take: context.limit,
          select: { id: true, materialName: true, unit: true, quantity: true, minQuantity: true, location: true },
        }),
      )
      if (inventory) {
        const lowStockItems = inventory
          .filter((item) => Number(item.quantity) <= Number(item.minQuantity))
          .slice(0, 10)
          .map((item) => ({
            ...item,
            quantity: toNumber(item.quantity),
            minQuantity: toNumber(item.minQuantity),
          }))
        output.warehouseRisks = lowStockItems
        lowStockItems.forEach((item) => sourceRefs.push(source('WAREHOUSE', 'Tồn kho', item.id, item.materialName)))
        usedSourceToolIds.push('WAREHOUSE')
      }

      const safetyReports = await withAiSource(context, 'SAFETY', () =>
        prisma.safetyReport.findMany({
          where: { projectId: context.projectId },
          orderBy: { reportDate: 'desc' },
          take: 8,
          select: {
            id: true,
            reportDate: true,
            location: true,
            violations: true,
            incident: { select: { severity: true, status: true } },
          },
        }),
      )
      if (safetyReports) {
        output.safetyRisks = safetyReports
          .filter((report) => report.violations > 0 || Boolean(report.incident && report.incident.status !== 'CLOSED'))
          .map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) }))
        safetyReports.forEach((report) =>
          sourceRefs.push(
            source(
              'SAFETY',
              'Báo cáo an toàn',
              report.id,
              `An toàn ${toDateOnly(report.reportDate)} - ${report.location}`,
            ),
          ),
        )
        usedSourceToolIds.push('SAFETY')
      }

      const qualityReports = await withAiSource(context, 'QUALITY', () =>
        prisma.qualityReport.findMany({
          where: { projectId: context.projectId },
          orderBy: { reportDate: 'desc' },
          take: 8,
          select: {
            id: true,
            reportDate: true,
            location: true,
            result: true,
            punchListItems: {
              where: { status: { in: ['OPEN', 'REJECTED'] } },
              select: { id: true, title: true, severity: true, status: true },
            },
          },
        }),
      )
      if (qualityReports) {
        output.qualityRisks = qualityReports
          .filter((report) => report.result !== 'PASS' || report.punchListItems.length > 0)
          .map((report) => ({ ...report, reportDate: toDateOnly(report.reportDate) }))
        qualityReports.forEach((report) =>
          sourceRefs.push(
            source(
              'QUALITY',
              'Báo cáo chất lượng',
              report.id,
              `Chất lượng ${toDateOnly(report.reportDate)} - ${report.location}`,
            ),
          ),
        )
        usedSourceToolIds.push('QUALITY')
      }

      const budgetItems = await withAiSource(context, 'BUDGET', () =>
        prisma.budgetItem.findMany({
          where: { projectId: context.projectId },
          orderBy: { updatedAt: 'desc' },
          take: context.limit,
          select: { id: true, category: true, estimatedCost: true, approvedCost: true, spentCost: true, status: true },
        }),
      )
      if (budgetItems) {
        output.budgetRisks = budgetItems
          .filter((item) => Number(item.spentCost) > Number(item.approvedCost ?? item.estimatedCost))
          .map((item) => ({
            ...item,
            estimatedCost: toNumber(item.estimatedCost),
            approvedCost: toNumber(item.approvedCost),
            spentCost: toNumber(item.spentCost),
          }))
        budgetItems.forEach((item) =>
          sourceRefs.push(source('BUDGET', 'Hạng mục ngân sách', item.id, `${TOOL_LABELS.BUDGET}: ${item.category}`)),
        )
        usedSourceToolIds.push('BUDGET')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },

  summarize_project_health: {
    name: 'summarize_project_health',
    sourceToolIds: ['PROJECT', 'TASK', 'DAILY_REPORT'],
    execute: async (context) => {
      const sourceRefs: AiContextSource[] = []
      const output: Record<string, unknown> = {}
      const usedSourceToolIds: AiSourceToolId[] = []

      const project = await withAiSource(context, 'PROJECT', () => getProjectOrThrow(context.projectId))
      if (project) {
        output.project = project
        sourceRefs.push(source('PROJECT', 'Dự án', project.id, project.name))
        usedSourceToolIds.push('PROJECT')
      }

      const tasks = await withAiSource(context, 'TASK', () =>
        prisma.task.findMany({
          where: { projectId: context.projectId },
          orderBy: { updatedAt: 'desc' },
          take: context.limit,
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        }),
      )
      if (tasks) {
        output.taskHealth = {
          counts: countBy(tasks),
          sampledTasks: tasks.map((task) => ({ ...task, dueDate: toDateOnly(task.dueDate) })),
        }
        tasks.forEach((task) => sourceRefs.push(source('TASK', 'Công việc', task.id, task.title)))
        usedSourceToolIds.push('TASK')
      }

      const reports = await withAiSource(context, 'DAILY_REPORT', () =>
        prisma.dailyReport.findMany({
          where: { projectId: context.projectId },
          orderBy: { reportDate: 'desc' },
          take: 7,
          select: { id: true, reportDate: true, progress: true, issues: true, workerCount: true },
        }),
      )
      if (reports) {
        output.reportHealth = reports.map((report) => ({
          ...report,
          reportDate: toDateOnly(report.reportDate),
          progress: toNumber(report.progress),
        }))
        reports.forEach((report) =>
          sourceRefs.push(
            source('DAILY_REPORT', 'Báo cáo ngày', report.id, `Báo cáo ngày ${toDateOnly(report.reportDate)}`),
          ),
        )
        usedSourceToolIds.push('DAILY_REPORT')
      }

      return { output, sourceRefs, usedSourceToolIds }
    },
  },
}

function addUniqueTool(names: AiToolName[], name: AiToolName) {
  if (!names.includes(name)) {
    names.push(name)
  }
}

function planPresetToolNames(preset: AiQuickPromptPreset | null | undefined): AiToolName[] | null {
  if (!preset) {
    return null
  }

  const presetTools: Record<AiQuickPromptPreset, AiToolName[]> = {
    WEEKLY_SUMMARY: [
      'get_project_overview',
      'get_project_weekly_snapshot',
      'summarize_project_health',
      'get_today_attention_items',
      'list_overdue_tasks',
      'summarize_daily_reports',
    ],
    OVERDUE_TASKS: [
      'get_project_overview',
      'list_overdue_tasks',
      'list_tasks_due_soon',
      'list_tasks_by_status',
      'analyze_delay_causes',
    ],
    SCHEDULE_RISK: [
      'get_project_overview',
      'list_overdue_tasks',
      'list_tasks_due_soon',
      'analyze_delay_causes',
      'summarize_daily_reports',
      'analyze_project_risks',
    ],
    LOW_STOCK_CHECK: [
      'get_project_overview',
      'list_low_stock_items',
      'get_material_usage_summary',
      'list_pending_warehouse_requests',
    ],
    SAFETY_QUALITY_SUMMARY: [
      'get_project_overview',
      'list_open_safety_issues',
      'summarize_recent_safety_reports',
      'suggest_safety_checklist',
      'list_open_quality_issues',
      'summarize_quality_reports',
      'suggest_quality_checklist',
    ],
    DAILY_REPORT_DRAFT: [
      'get_project_overview',
      'build_daily_report_draft_context',
      'list_overdue_tasks',
      'summarize_daily_reports',
    ],
  }

  return presetTools[preset]
}

function planToolNames(question: string, intent: AiMessageIntent, preset?: AiQuickPromptPreset | null): AiToolName[] {
  const presetTools = planPresetToolNames(preset)
  if (presetTools) {
    return presetTools
  }

  const text = normalizeText(question)
  const tools: AiToolName[] = ['get_project_overview']

  if (intent === 'DRAFT_DAILY_REPORT') {
    return ['get_project_overview', 'build_daily_report_draft_context', 'list_overdue_tasks', 'summarize_daily_reports']
  }
  if (intent === 'DRAFT_SAFETY_CHECKLIST') {
    return [
      'get_project_overview',
      'summarize_recent_safety_reports',
      'list_open_safety_issues',
      'suggest_safety_checklist',
    ]
  }
  if (intent === 'DRAFT_QUALITY_CHECKLIST') {
    return [
      'get_project_overview',
      'summarize_quality_reports',
      'list_open_quality_issues',
      'suggest_quality_checklist',
    ]
  }

  if (hasAny(text, ['tóm tắt', 'tình hình', 'tổng quan', 'tuần', 'hôm nay', 'sức khỏe', 'dashboard'])) {
    addUniqueTool(tools, 'get_project_weekly_snapshot')
    addUniqueTool(tools, 'summarize_project_health')
    addUniqueTool(tools, 'get_today_attention_items')
  }

  if (hasAny(text, ['task', 'công việc', 'quá hạn', 'trễ', 'chậm', 'deadline', 'tiến độ'])) {
    addUniqueTool(tools, 'list_overdue_tasks')
    addUniqueTool(tools, 'list_tasks_due_soon')
    addUniqueTool(tools, 'list_tasks_by_status')
    addUniqueTool(tools, 'analyze_delay_causes')
  }

  if (hasAny(text, ['báo cáo', 'nhật ký', 'report', 'worker', 'nhân công'])) {
    addUniqueTool(tools, 'list_recent_daily_reports')
    addUniqueTool(tools, 'summarize_daily_reports')
  }

  if (hasAny(text, ['kho', 'vật tư', 'tồn kho', 'xuất kho', 'nhập kho', 'material'])) {
    addUniqueTool(tools, 'list_low_stock_items')
    addUniqueTool(tools, 'get_material_usage_summary')
    addUniqueTool(tools, 'list_pending_warehouse_requests')
  }

  if (hasAny(text, ['ngân sách', 'chi phí', 'giải ngân', 'budget', 'vượt', 'tiền'])) {
    addUniqueTool(tools, 'get_budget_summary')
    addUniqueTool(tools, 'list_over_budget_items')
    addUniqueTool(tools, 'list_pending_disbursements')
  }

  if (hasAny(text, ['an toàn', 'sự cố', 'near miss', 'vi phạm', 'checklist an toàn'])) {
    addUniqueTool(tools, 'list_open_safety_issues')
    addUniqueTool(tools, 'summarize_recent_safety_reports')
    addUniqueTool(tools, 'suggest_safety_checklist')
  }

  if (hasAny(text, ['chất lượng', 'qc', 'nghiệm thu', 'punch', 'lỗi', 'checklist chất lượng'])) {
    addUniqueTool(tools, 'list_open_quality_issues')
    addUniqueTool(tools, 'summarize_quality_reports')
    addUniqueTool(tools, 'suggest_quality_checklist')
  }

  if (hasAny(text, ['file', 'tệp', 'tài liệu', 'document', 'upload', 'hồ sơ'])) {
    addUniqueTool(tools, 'list_project_files')
    addUniqueTool(tools, 'search_document_metadata')
    addUniqueTool(tools, 'summarize_uploaded_file_metadata')
  }

  if (hasAny(text, ['rủi ro', 'cần chú ý', 'ưu tiên', 'xử lý', 'nguy cơ'])) {
    addUniqueTool(tools, 'analyze_project_risks')
    addUniqueTool(tools, 'get_today_attention_items')
  }

  if (tools.length === 1) {
    addUniqueTool(tools, 'summarize_project_health')
  }

  return tools.slice(0, 12)
}

export async function runAiToolGateway(params: RunAiToolGatewayParams): Promise<AiToolGatewayContext> {
  const now = params.now ?? new Date()
  const limit = getLimit(params.maxContextItems)
  const selectedToolNames = planToolNames(params.question, params.intent, params.quickPromptPreset)
  const includedToolIds = new Set<AiSourceToolId>()
  const omittedByToolId = new Map<AiSourceToolId, AiOmittedTool>()
  const sources: AiContextSource[] = []
  const data: Record<string, unknown> = {}
  const toolCalls: AiToolCallMeta[] = []
  const toolResults: AiToolResultMeta[] = []
  const readableSourceTools = getAllowedAiSources(params.permissions, params.enabledSourceTools)

  const evaluateSourceTool = (toolId: AiSourceToolId) => {
    if (!isAiSourceEnabled(toolId, params.enabledSourceTools)) {
      omittedByToolId.set(toolId, { toolId, reason: 'DISABLED' })
      return false
    }
    if (!readableSourceTools.has(toolId)) {
      omittedByToolId.set(toolId, { toolId, reason: 'NO_PERMISSION' })
      return false
    }
    return true
  }

  for (const toolName of selectedToolNames) {
    const definition = toolDefinitions[toolName]
    const allowedSourceTools = new Set(definition.sourceToolIds.filter(evaluateSourceTool))

    if (allowedSourceTools.size === 0) {
      const firstDenied = definition.sourceToolIds
        .map((toolId) => omittedByToolId.get(toolId)?.reason)
        .find((reason): reason is AiOmittedTool['reason'] => Boolean(reason))
      toolCalls.push({
        name: definition.name,
        sourceToolIds: definition.sourceToolIds,
        status: 'OMITTED',
        omittedReason: firstDenied ?? 'NO_PERMISSION',
      })
      continue
    }

    toolCalls.push({
      name: definition.name,
      sourceToolIds: [...allowedSourceTools],
      status: 'EXECUTED',
    })

    const result = await definition.execute({
      ...params,
      now,
      limit,
      allowedSourceTools,
    })
    const usedSourceToolIds = result.usedSourceToolIds ?? [...allowedSourceTools]
    usedSourceToolIds.forEach((toolId) => includedToolIds.add(toolId))
    sources.push(...result.sourceRefs)
    data[definition.name] = result.output
    toolResults.push({
      name: definition.name,
      sourceToolIds: usedSourceToolIds,
      output: result.output,
      sourceRefs: result.sourceRefs,
    })
  }

  return {
    projectId: params.projectId,
    generatedAt: now.toISOString(),
    includedTools: AI_SOURCE_TOOL_IDS.filter((toolId) => includedToolIds.has(toolId)),
    omittedTools: AI_SOURCE_TOOL_IDS.map((toolId) => omittedByToolId.get(toolId)).filter(
      (item): item is AiOmittedTool => Boolean(item),
    ),
    sources,
    data,
    toolCalls,
    toolResults,
  }
}

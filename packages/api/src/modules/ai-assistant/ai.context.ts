import { hasMinPermission, TOOL_LABELS, type PermissionLevel, type ToolId, type ToolPermissionMap } from "@construction/shared";
import { prisma } from "../../config/database";
import { NotFoundError } from "../../shared/errors";

export const AI_SOURCE_TOOL_IDS = [
  "PROJECT",
  "TASK",
  "DAILY_REPORT",
  "FILE",
  "DOCUMENT",
  "SAFETY",
  "QUALITY",
  "WAREHOUSE",
  "BUDGET",
] as const satisfies readonly ToolId[];

export type AiSourceToolId = (typeof AI_SOURCE_TOOL_IDS)[number];

export interface AiContextSource {
  toolId: AiSourceToolId;
  recordType: string;
  recordId: string;
  title?: string;
}

export interface AiOmittedTool {
  toolId: AiSourceToolId;
  reason: "NO_PERMISSION" | "DISABLED";
}

export interface AiContextPayload {
  projectId: string;
  generatedAt: string;
  includedTools: AiSourceToolId[];
  omittedTools: AiOmittedTool[];
  sources: AiContextSource[];
  data: Record<string, unknown>;
}

export interface BuildAiContextParams {
  projectId: string;
  permissions: ToolPermissionMap;
  enabledSourceTools: AiSourceToolId[] | null;
  now?: Date;
}

function canReadTool(permissions: ToolPermissionMap, toolId: ToolId) {
  return hasMinPermission((permissions[toolId] ?? "NONE") as PermissionLevel, "READ");
}

function isEnabled(toolId: AiSourceToolId, enabledSourceTools: AiSourceToolId[] | null) {
  return !enabledSourceTools || enabledSourceTools.includes(toolId);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return value;
  }
  return Number(value);
}

function toDateOnly(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString().slice(0, 10);
}

function addSource(sources: AiContextSource[], source: AiContextSource) {
  sources.push(source);
}

function markTool(
  toolId: AiSourceToolId,
  params: BuildAiContextParams,
  includedTools: AiSourceToolId[],
  omittedTools: AiOmittedTool[]
) {
  if (!isEnabled(toolId, params.enabledSourceTools)) {
    omittedTools.push({ toolId, reason: "DISABLED" });
    return false;
  }

  if (!canReadTool(params.permissions, toolId)) {
    omittedTools.push({ toolId, reason: "NO_PERMISSION" });
    return false;
  }

  includedTools.push(toolId);
  return true;
}

export function parseEnabledSourceTools(value: unknown): AiSourceToolId[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const allowed = new Set<AiSourceToolId>(AI_SOURCE_TOOL_IDS);
  return value.filter((item): item is AiSourceToolId => allowed.has(item as AiSourceToolId));
}

export async function buildAiContext(params: BuildAiContextParams): Promise<AiContextPayload> {
  const includedTools: AiSourceToolId[] = [];
  const omittedTools: AiOmittedTool[] = [];
  const sources: AiContextSource[] = [];
  const data: Record<string, unknown> = {};
  const generatedAt = (params.now ?? new Date()).toISOString();

  if (markTool("PROJECT", params, includedTools, omittedTools)) {
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
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
    });

    if (!project) {
      throw new NotFoundError("Không tìm thấy dự án");
    }

    data.project = {
      ...project,
      progress: toNumber(project.progress),
      startDate: toDateOnly(project.startDate),
      endDate: toDateOnly(project.endDate),
    };
    addSource(sources, {
      toolId: "PROJECT",
      recordType: "Project",
      recordId: project.id,
      title: project.name,
    });
  }

  if (markTool("TASK", params, includedTools, omittedTools)) {
    const tasks = await prisma.task.findMany({
      where: { projectId: params.projectId },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 40,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        approvalStatus: true,
        assignee: { select: { id: true, name: true } },
      },
    });
    data.tasks = tasks.map((task) => ({
      ...task,
      dueDate: toDateOnly(task.dueDate),
      completedAt: task.completedAt?.toISOString() ?? null,
    }));
    for (const task of tasks) {
      addSource(sources, { toolId: "TASK", recordType: "Task", recordId: task.id, title: task.title });
    }
  }

  if (markTool("DAILY_REPORT", params, includedTools, omittedTools)) {
    const reports = await prisma.dailyReport.findMany({
      where: { projectId: params.projectId },
      orderBy: { reportDate: "desc" },
      take: 14,
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
    });
    data.dailyReports = reports.map((report) => ({
      ...report,
      reportDate: toDateOnly(report.reportDate),
      progress: toNumber(report.progress),
    }));
    for (const report of reports) {
      addSource(sources, {
        toolId: "DAILY_REPORT",
        recordType: "DailyReport",
        recordId: report.id,
        title: `Báo cáo ngày ${toDateOnly(report.reportDate)}`,
      });
    }
  }

  if (markTool("FILE", params, includedTools, omittedTools)) {
    const files = await prisma.projectFile.findMany({
      where: { projectId: params.projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
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
    });
    data.files = files.map((file) => ({
      ...file,
      createdAt: file.createdAt.toISOString(),
    }));
    for (const file of files) {
      addSource(sources, {
        toolId: "FILE",
        recordType: "ProjectFile",
        recordId: file.id,
        title: file.originalName,
      });
    }
  }

  if (markTool("DOCUMENT", params, includedTools, omittedTools)) {
    const folders = await prisma.documentFolder.findMany({
      where: { projectId: params.projectId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        creator: { select: { id: true, name: true } },
      },
    });
    data.documentFolders = folders.map((folder) => ({
      ...folder,
      createdAt: folder.createdAt.toISOString(),
    }));
    for (const folder of folders) {
      addSource(sources, {
        toolId: "DOCUMENT",
        recordType: "DocumentFolder",
        recordId: folder.id,
        title: folder.name,
      });
    }
  }

  if (markTool("SAFETY", params, includedTools, omittedTools)) {
    const safetyReports = await prisma.safetyReport.findMany({
      where: { projectId: params.projectId },
      orderBy: { reportDate: "desc" },
      take: 12,
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
    });
    data.safetyReports = safetyReports.map((report) => ({
      ...report,
      reportDate: toDateOnly(report.reportDate),
    }));
    for (const report of safetyReports) {
      addSource(sources, {
        toolId: "SAFETY",
        recordType: "SafetyReport",
        recordId: report.id,
        title: `An toàn ${toDateOnly(report.reportDate)} - ${report.location}`,
      });
    }
  }

  if (markTool("QUALITY", params, includedTools, omittedTools)) {
    const qualityReports = await prisma.qualityReport.findMany({
      where: { projectId: params.projectId },
      orderBy: { reportDate: "desc" },
      take: 12,
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
          select: { id: true, title: true, description: true, severity: true, status: true, location: true },
        },
      },
    });
    data.qualityReports = qualityReports.map((report) => ({
      ...report,
      reportDate: toDateOnly(report.reportDate),
    }));
    for (const report of qualityReports) {
      addSource(sources, {
        toolId: "QUALITY",
        recordType: "QualityReport",
        recordId: report.id,
        title: `Chất lượng ${toDateOnly(report.reportDate)} - ${report.location}`,
      });
    }
  }

  if (markTool("WAREHOUSE", params, includedTools, omittedTools)) {
    const inventory = await prisma.warehouseInventory.findMany({
      where: { projectId: params.projectId },
      orderBy: { updatedAt: "desc" },
      take: 40,
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
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, type: true, quantity: true, status: true, note: true, createdAt: true },
        },
      },
    });
    data.warehouseInventory = inventory.map((item) => ({
      ...item,
      quantity: toNumber(item.quantity),
      minQuantity: toNumber(item.minQuantity),
      maxQuantity: toNumber(item.maxQuantity),
      updatedAt: item.updatedAt.toISOString(),
      transactions: item.transactions.map((transaction) => ({
        ...transaction,
        quantity: toNumber(transaction.quantity),
        createdAt: transaction.createdAt.toISOString(),
      })),
    }));
    for (const item of inventory) {
      addSource(sources, {
        toolId: "WAREHOUSE",
        recordType: "WarehouseInventory",
        recordId: item.id,
        title: item.materialName,
      });
    }
  }

  if (markTool("BUDGET", params, includedTools, omittedTools)) {
    const budgetItems = await prisma.budgetItem.findMany({
      where: { projectId: params.projectId },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        category: true,
        description: true,
        estimatedCost: true,
        approvedCost: true,
        spentCost: true,
        status: true,
        updatedAt: true,
        disbursements: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, amount: true, status: true, note: true, approvedAt: true, createdAt: true },
        },
      },
    });
    data.budgetItems = budgetItems.map((item) => ({
      ...item,
      estimatedCost: toNumber(item.estimatedCost),
      approvedCost: toNumber(item.approvedCost),
      spentCost: toNumber(item.spentCost),
      updatedAt: item.updatedAt.toISOString(),
      disbursements: item.disbursements.map((disbursement) => ({
        ...disbursement,
        amount: toNumber(disbursement.amount),
        approvedAt: disbursement.approvedAt?.toISOString() ?? null,
        createdAt: disbursement.createdAt.toISOString(),
      })),
    }));
    for (const item of budgetItems) {
      addSource(sources, {
        toolId: "BUDGET",
        recordType: "BudgetItem",
        recordId: item.id,
        title: `${TOOL_LABELS.BUDGET}: ${item.category}`,
      });
    }
  }

  return {
    projectId: params.projectId,
    generatedAt,
    includedTools,
    omittedTools,
    sources,
    data,
  };
}

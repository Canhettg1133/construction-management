import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolPermissionMap } from "@construction/shared";

const prismaMock = {
  project: { findUnique: vi.fn() },
  task: { findMany: vi.fn() },
  dailyReport: { findMany: vi.fn() },
  projectFile: { findMany: vi.fn() },
  documentFolder: { findMany: vi.fn() },
  safetyReport: { findMany: vi.fn() },
  qualityReport: { findMany: vi.fn() },
  warehouseInventory: { findMany: vi.fn() },
  budgetItem: { findMany: vi.fn() },
};

vi.mock("../../config/database", () => ({
  prisma: prismaMock,
}));

const { buildAiContext } = await import("./ai.context");

const basePermissions: ToolPermissionMap = {
  PROJECT: "READ",
  TASK: "READ",
  DAILY_REPORT: "READ",
  FILE: "READ",
  DOCUMENT: "READ",
  SAFETY: "READ",
  QUALITY: "READ",
  WAREHOUSE: "READ",
  BUDGET: "READ",
  AI_ASSISTANT: "READ",
};

function mockEmptyData() {
  prismaMock.project.findUnique.mockResolvedValue({
    id: "project-1",
    code: "CT-001",
    name: "Dự án kiểm thử",
    description: null,
    location: "Hà Nội",
    clientName: "Chủ đầu tư",
    startDate: new Date("2026-05-01T00:00:00.000Z"),
    endDate: null,
    status: "ACTIVE",
    progress: 35,
  });
  prismaMock.task.findMany.mockResolvedValue([]);
  prismaMock.dailyReport.findMany.mockResolvedValue([]);
  prismaMock.projectFile.findMany.mockResolvedValue([]);
  prismaMock.documentFolder.findMany.mockResolvedValue([]);
  prismaMock.safetyReport.findMany.mockResolvedValue([]);
  prismaMock.qualityReport.findMany.mockResolvedValue([]);
  prismaMock.warehouseInventory.findMany.mockResolvedValue([]);
  prismaMock.budgetItem.findMany.mockResolvedValue([]);
}

describe("buildAiContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmptyData();
  });

  it("không truy vấn ngân sách khi user không có quyền BUDGET", async () => {
    const context = await buildAiContext({
      projectId: "project-1",
      permissions: {
        ...basePermissions,
        BUDGET: "NONE",
      },
      enabledSourceTools: null,
      now: new Date("2026-05-07T00:00:00.000Z"),
    });

    expect(prismaMock.budgetItem.findMany).not.toHaveBeenCalled();
    expect(context.includedTools).not.toContain("BUDGET");
    expect(context.omittedTools).toContainEqual({
      toolId: "BUDGET",
      reason: "NO_PERMISSION",
    });
  });

  it("chỉ ghi nguồn cho các phân hệ thật sự được đưa vào context", async () => {
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: "task-1",
        title: "Hoàn thiện móng",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: new Date("2026-05-06T00:00:00.000Z"),
        assignee: { id: "user-1", name: "Kỹ sư A" },
      },
    ]);

    const context = await buildAiContext({
      projectId: "project-1",
      permissions: {
        ...basePermissions,
        WAREHOUSE: "NONE",
      },
      enabledSourceTools: ["PROJECT", "TASK", "WAREHOUSE"],
      now: new Date("2026-05-07T00:00:00.000Z"),
    });

    expect(prismaMock.warehouseInventory.findMany).not.toHaveBeenCalled();
    expect(context.includedTools).toEqual(["PROJECT", "TASK"]);
    expect(context.sources).toEqual([
      {
        toolId: "PROJECT",
        recordType: "Project",
        recordId: "project-1",
        title: "Dự án kiểm thử",
      },
      {
        toolId: "TASK",
        recordType: "Task",
        recordId: "task-1",
        title: "Hoàn thiện móng",
      },
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOOL_IDS, type PermissionLevel, type ToolPermissionMap } from '@construction/shared'

const prismaMock = {
  project: {
    findUnique: vi.fn(),
  },
  task: {
    findMany: vi.fn(),
  },
  dailyReport: {
    findMany: vi.fn(),
  },
  warehouseInventory: {
    findMany: vi.fn(),
  },
  warehouseTransaction: {
    findMany: vi.fn(),
  },
  budgetItem: {
    findMany: vi.fn(),
  },
  budgetDisbursement: {
    findMany: vi.fn(),
  },
  safetyReport: {
    findMany: vi.fn(),
  },
  qualityReport: {
    findMany: vi.fn(),
  },
  projectFile: {
    findMany: vi.fn(),
  },
  documentFolder: {
    findMany: vi.fn(),
  },
}

vi.mock('../../config/database', () => ({
  prisma: prismaMock,
}))

const { runAiToolGateway } = await import('./ai.tools')

function permissions(level: PermissionLevel, overrides: Partial<ToolPermissionMap> = {}): ToolPermissionMap {
  return {
    ...(Object.fromEntries(TOOL_IDS.map((toolId) => [toolId, level])) as ToolPermissionMap),
    ...overrides,
  }
}

describe('runAiToolGateway', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.project.findUnique.mockResolvedValue({
      id: 'project-1',
      code: 'PRJ-001',
      name: 'Dự án kiểm thử',
      description: null,
      location: 'Hà Nội',
      clientName: 'Chủ đầu tư',
      startDate: new Date('2026-01-01'),
      endDate: null,
      status: 'ACTIVE',
      progress: 50,
    })
    prismaMock.task.findMany.mockResolvedValue([])
    prismaMock.dailyReport.findMany.mockResolvedValue([])
    prismaMock.warehouseInventory.findMany.mockResolvedValue([])
    prismaMock.warehouseTransaction.findMany.mockResolvedValue([])
    prismaMock.budgetItem.findMany.mockResolvedValue([])
    prismaMock.budgetDisbursement.findMany.mockResolvedValue([])
    prismaMock.safetyReport.findMany.mockResolvedValue([])
    prismaMock.qualityReport.findMany.mockResolvedValue([])
    prismaMock.projectFile.findMany.mockResolvedValue([])
    prismaMock.documentFolder.findMany.mockResolvedValue([])
  })

  it('ưu tiên quick prompt preset thay vì đoán tool từ nội dung câu hỏi', async () => {
    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Cho tôi kiểm tra nhanh',
      intent: 'CHAT',
      quickPromptPreset: 'LOW_STOCK_CHECK',
      permissions: permissions('READ'),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(prismaMock.warehouseInventory.findMany).toHaveBeenCalled()
    expect(prismaMock.warehouseTransaction.findMany).toHaveBeenCalled()
    expect(prismaMock.task.findMany).not.toHaveBeenCalled()
    expect(context.toolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'list_low_stock_items', status: 'EXECUTED' }),
        expect.objectContaining({ name: 'get_material_usage_summary', status: 'EXECUTED' }),
      ]),
    )
  })

  it('không chạy tool tồn kho khi user không có quyền WAREHOUSE', async () => {
    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Kiểm tra tồn kho thấp',
      intent: 'CHAT',
      quickPromptPreset: 'LOW_STOCK_CHECK',
      permissions: permissions('READ', { WAREHOUSE: 'NONE' }),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(prismaMock.warehouseInventory.findMany).not.toHaveBeenCalled()
    expect(prismaMock.warehouseTransaction.findMany).not.toHaveBeenCalled()
    expect(context.includedTools).not.toContain('WAREHOUSE')
    expect(context.omittedTools).toContainEqual({ toolId: 'WAREHOUSE', reason: 'NO_PERMISSION' })
    expect(JSON.stringify(context.data)).not.toContain('materialName')
  })

  it('không chạy preset việc quá hạn khi user không có quyền TASK', async () => {
    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Liệt kê công việc quá hạn',
      intent: 'CHAT',
      quickPromptPreset: 'OVERDUE_TASKS',
      permissions: permissions('READ', { TASK: 'NONE' }),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(prismaMock.task.findMany).not.toHaveBeenCalled()
    expect(context.includedTools).not.toContain('TASK')
    expect(context.omittedTools).toContainEqual({ toolId: 'TASK', reason: 'NO_PERMISSION' })
    expect(context.toolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'list_overdue_tasks', status: 'OMITTED', omittedReason: 'NO_PERMISSION' }),
      ]),
    )
  })

  it('không chạy tool ngân sách khi nguồn BUDGET bị tắt toàn hệ thống', async () => {
    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Tóm tắt ngân sách và giải ngân',
      intent: 'CHAT',
      permissions: permissions('ADMIN'),
      enabledSourceTools: ['PROJECT', 'TASK'],
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(prismaMock.budgetItem.findMany).not.toHaveBeenCalled()
    expect(prismaMock.budgetDisbursement.findMany).not.toHaveBeenCalled()
    expect(context.includedTools).not.toContain('BUDGET')
    expect(context.omittedTools).toContainEqual({ toolId: 'BUDGET', reason: 'DISABLED' })
  })

  it('tool nhiều nguồn chỉ query các nguồn được phép', async () => {
    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Rủi ro cần chú ý hôm nay',
      intent: 'CHAT',
      permissions: permissions('NONE', { TASK: 'READ' }),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(prismaMock.task.findMany).toHaveBeenCalled()
    expect(prismaMock.project.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.warehouseInventory.findMany).not.toHaveBeenCalled()
    expect(prismaMock.budgetItem.findMany).not.toHaveBeenCalled()
    expect(prismaMock.budgetDisbursement.findMany).not.toHaveBeenCalled()
    expect(prismaMock.safetyReport.findMany).not.toHaveBeenCalled()
    expect(prismaMock.qualityReport.findMany).not.toHaveBeenCalled()
    expect(context.includedTools).toEqual(['TASK'])
    expect(context.toolResults).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'analyze_project_risks', sourceToolIds: ['TASK'] })]),
    )
  })

  it('summarize_project_health chỉ khai báo các nguồn thật sự query', async () => {
    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Tóm tắt tổng quan dự án hôm nay',
      intent: 'CHAT',
      permissions: permissions('READ'),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(context.toolCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'summarize_project_health',
          sourceToolIds: ['PROJECT', 'TASK', 'DAILY_REPORT'],
          status: 'EXECUTED',
        }),
      ]),
    )
    expect(context.toolResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'summarize_project_health',
          sourceToolIds: ['PROJECT', 'TASK', 'DAILY_REPORT'],
        }),
      ]),
    )
  })

  it('chỉ ghi source thật sự được đưa vào tool result', async () => {
    prismaMock.budgetItem.findMany.mockResolvedValue([
      {
        id: 'budget-1',
        category: 'Nhân công',
        description: 'Chi phí nhân công',
        estimatedCost: 1000,
        approvedCost: 900,
        spentCost: 1200,
        status: 'APPROVED',
        updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      },
    ])

    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Ngân sách có khoản nào vượt không?',
      intent: 'CHAT',
      permissions: permissions('ADMIN'),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-07T00:00:00.000Z'),
    })

    expect(prismaMock.budgetItem.findMany).toHaveBeenCalled()
    expect(context.includedTools).toContain('BUDGET')
    expect(context.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolId: 'BUDGET', recordType: 'Hạng mục ngân sách', recordId: 'budget-1' }),
      ]),
    )
    expect(context.sources).not.toEqual(expect.arrayContaining([expect.objectContaining({ toolId: 'WAREHOUSE' })]))
  })

  it('đưa vật tư, an toàn và chất lượng vào context bản nháp báo cáo ngày', async () => {
    prismaMock.warehouseInventory.findMany.mockResolvedValue([
      {
        id: 'material-1',
        materialName: 'Thép D16',
        unit: 'kg',
        quantity: 90,
        minQuantity: 100,
        maxQuantity: 500,
        location: 'Kho A',
        updatedAt: new Date('2026-05-14T01:00:00.000Z'),
        transactions: [
          {
            id: 'txn-1',
            type: 'OUT',
            quantity: 25,
            status: 'APPROVED',
            note: 'Xuất cho mố cầu',
            createdAt: new Date('2026-05-14T00:30:00.000Z'),
          },
        ],
      },
    ])
    prismaMock.safetyReport.findMany.mockResolvedValue([
      {
        id: 'safety-1',
        reportDate: new Date('2026-05-13T00:00:00.000Z'),
        location: 'Khu vực mố cầu',
        description: 'Nhắc nhở bổ sung dây an toàn',
        violations: 1,
        status: 'PENDING',
        checklistItems: [{ id: 'check-1', label: 'Dây an toàn', checked: false, note: 'Cần bổ sung' }],
        incident: null,
        nearMiss: null,
      },
    ])
    prismaMock.qualityReport.findMany.mockResolvedValue([
      {
        id: 'quality-1',
        reportDate: new Date('2026-05-13T00:00:00.000Z'),
        location: 'Bãi vật liệu',
        description: 'Nghiệm thu thép đầu vào',
        status: 'APPROVED',
        result: 'CONDITIONAL',
        notes: 'Chờ bổ sung chứng chỉ lô hàng',
        punchListItems: [
          { id: 'punch-1', title: 'Bổ sung CO/CQ', severity: 'MEDIUM', status: 'OPEN', location: 'Kho A' },
        ],
      },
    ])

    const context = await runAiToolGateway({
      projectId: 'project-1',
      question: 'Gợi ý nội dung báo cáo ngày hôm nay',
      intent: 'DRAFT_DAILY_REPORT',
      quickPromptPreset: 'DAILY_REPORT_DRAFT',
      permissions: permissions('READ'),
      enabledSourceTools: null,
      maxContextItems: 20,
      now: new Date('2026-05-14T00:00:00.000Z'),
    })

    const draftContext = context.toolResults.find((result) => result.name === 'build_daily_report_draft_context')

    expect(prismaMock.warehouseInventory.findMany).toHaveBeenCalled()
    expect(prismaMock.safetyReport.findMany).toHaveBeenCalled()
    expect(prismaMock.qualityReport.findMany).toHaveBeenCalled()
    expect(draftContext?.sourceToolIds).toEqual(
      expect.arrayContaining(['PROJECT', 'TASK', 'DAILY_REPORT', 'WAREHOUSE', 'SAFETY', 'QUALITY']),
    )
    expect(draftContext?.output).toEqual(
      expect.objectContaining({
        warehouseInventory: [
          expect.objectContaining({
            materialName: 'Thép D16',
            quantity: 90,
            transactions: [expect.objectContaining({ type: 'OUT', quantity: 25 })],
          }),
        ],
        lowStockItems: [expect.objectContaining({ materialName: 'Thép D16' })],
        recentSafetyReports: [expect.objectContaining({ location: 'Khu vực mố cầu', violations: 1 })],
        openSafetyIssues: [expect.objectContaining({ location: 'Khu vực mố cầu', violations: 1 })],
        recentQualityReports: [expect.objectContaining({ location: 'Bãi vật liệu', result: 'CONDITIONAL' })],
        openQualityIssues: [expect.objectContaining({ location: 'Bãi vật liệu', result: 'CONDITIONAL' })],
        equipmentData: expect.objectContaining({ available: false }),
      }),
    )
    expect(context.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolId: 'WAREHOUSE', recordId: 'material-1' }),
        expect.objectContaining({ toolId: 'SAFETY', recordId: 'safety-1' }),
        expect.objectContaining({ toolId: 'QUALITY', recordId: 'quality-1' }),
      ]),
    )
  })
})

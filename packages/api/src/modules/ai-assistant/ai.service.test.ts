import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserProjectPermissions } from '@construction/shared'

process.env.AI_SECRET_ENCRYPTION_KEY = 'test-ai-secret-encryption-key-32-chars'

const prismaMock = {
  aiChatThread: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  aiChatMessage: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  projectAiSetting: {
    findUnique: vi.fn(),
  },
  aiSystemSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  aiProviderProfile: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  aiProviderCredential: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}

vi.mock('../../config/database', () => ({
  prisma: prismaMock,
}))

vi.mock('./ai.context', () => ({
  AI_SOURCE_TOOL_IDS: [
    'PROJECT',
    'TASK',
    'DAILY_REPORT',
    'FILE',
    'DOCUMENT',
    'SAFETY',
    'QUALITY',
    'WAREHOUSE',
    'BUDGET',
  ],
  parseEnabledSourceTools: vi.fn((value) => (Array.isArray(value) ? value : null)),
  buildAiContext: vi.fn().mockResolvedValue({
    projectId: 'project-1',
    generatedAt: '2026-05-07T00:00:00.000Z',
    includedTools: ['PROJECT'],
    omittedTools: [],
    sources: [],
    data: { project: { id: 'project-1', name: 'Dự án kiểm thử' } },
  }),
}))

const aiToolsMock = {
  runAiToolGateway: vi.fn().mockResolvedValue({
    projectId: 'project-1',
    generatedAt: '2026-05-07T00:00:00.000Z',
    includedTools: ['PROJECT'],
    omittedTools: [],
    sources: [],
    data: { project: { id: 'project-1', name: 'Dự án kiểm thử' } },
    toolCalls: [{ name: 'get_project_overview', sourceToolIds: ['PROJECT'], status: 'EXECUTED' }],
    toolResults: [{ name: 'get_project_overview', sourceToolIds: ['PROJECT'], output: {}, sourceRefs: [] }],
  }),
}

vi.mock('./ai.tools', () => aiToolsMock)

vi.mock('./ai.prompt', () => ({
  buildAiPrompt: vi.fn(() => ({ system: 'system', user: 'user' })),
}))

class MockAiProviderCallError extends Error {
  code: string

  constructor(code: string) {
    super(code)
    this.code = code
  }
}

const providerMock = {
  callAiProvider: vi.fn(),
  callAiProviderStream: vi.fn(),
  listAiProviderModels: vi.fn(),
  getEnvProviderProfile: vi.fn(() => ({
    id: 'env:MOCK',
    name: 'Mock provider',
    provider: 'MOCK',
    baseUrl: null,
    model: 'mock-construction-assistant',
    apiKey: null,
    readonly: true,
  })),
  AiProviderCallError: MockAiProviderCallError,
}

vi.mock('./ai.provider', () => providerMock)
vi.mock('../audit/audit.service', () => ({
  auditService: { log: vi.fn() },
}))

const { aiAssistantService } = await import('./ai.service')
const { encryptSecret } = await import('./ai.crypto')

const basePermissions: UserProjectPermissions = {
  projectId: 'project-1',
  userId: 'owner-user',
  systemRole: 'STAFF',
  projectRole: 'ENGINEER',
  toolPermissions: {
    PROJECT: 'READ',
    TASK: 'READ',
    DAILY_REPORT: 'READ',
    FILE: 'READ',
    DOCUMENT: 'READ',
    SAFETY: 'READ',
    QUALITY: 'READ',
    WAREHOUSE: 'READ',
    BUDGET: 'READ',
    AI_ASSISTANT: 'STANDARD',
  },
  specialPrivileges: [],
  effectiveRole: {
    isAdmin: false,
    canManageMembers: false,
    canApproveSafety: false,
    canApproveQuality: false,
    canApproveBudget: false,
  },
}

const AI_DATA_SOURCE_IDS = [
  'PROJECT',
  'TASK',
  'DAILY_REPORT',
  'FILE',
  'DOCUMENT',
  'SAFETY',
  'QUALITY',
  'WAREHOUSE',
  'BUDGET',
] as const

const REDACTED_CONTENT = '**Nội dung đã bị ẩn** vì quyền truy cập dữ liệu của bạn đã thay đổi.'

function permissionsWith(overrides: Partial<UserProjectPermissions['toolPermissions']>): UserProjectPermissions {
  return {
    ...basePermissions,
    toolPermissions: {
      ...basePermissions.toolPermissions,
      ...overrides,
    },
  }
}

function mockAccessibleThread(ownerId = 'owner-user') {
  prismaMock.aiChatThread.findUnique.mockResolvedValue({
    id: 'thread-1',
    projectId: 'project-1',
    ownerId,
    title: 'Thread kiểm thử',
    providerProfileId: null,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    deletedAt: null,
  })
}

function makeAssistantMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'message-assistant',
    threadId: 'thread-1',
    projectId: 'project-1',
    userId: null,
    role: 'ASSISTANT',
    content: 'Nội dung có dữ liệu từ công cụ',
    provider: 'MOCK',
    model: 'mock-construction-assistant',
    latencyMs: 10,
    contextSources: [],
    toolCalls: [],
    toolResults: [],
    omittedTools: [],
    errorCode: null,
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    editedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('aiAssistantService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.aiChatMessage.create.mockImplementation(async ({ data }) => ({
      id: data.role === 'USER' ? 'message-user' : 'message-assistant',
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      editedAt: null,
      deletedAt: null,
      ...data,
    }))
    prismaMock.aiChatMessage.findFirst.mockResolvedValue(null)
    prismaMock.aiChatMessage.findMany.mockResolvedValue([])
    prismaMock.aiChatMessage.update.mockImplementation(async ({ data }) => ({
      id: 'message-user',
      threadId: 'thread-1',
      projectId: 'project-1',
      userId: 'owner-user',
      role: 'USER',
      content: data.content,
      provider: null,
      model: null,
      latencyMs: null,
      contextSources: null,
      errorCode: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      editedAt: data.editedAt,
      deletedAt: null,
    }))
    prismaMock.aiChatMessage.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.aiChatThread.findMany.mockResolvedValue([])
    prismaMock.aiChatThread.create.mockImplementation(async ({ data }) => ({
      id: 'thread-created',
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      deletedAt: null,
      ...data,
    }))
    prismaMock.aiChatThread.update.mockResolvedValue({})
    prismaMock.projectAiSetting.findUnique.mockResolvedValue(null)
    prismaMock.aiSystemSetting.findUnique.mockResolvedValue(null)
    prismaMock.aiSystemSetting.upsert.mockImplementation(async ({ create, update }) => ({
      id: 'global',
      defaultProviderProfileId: update.defaultProviderProfileId ?? create.defaultProviderProfileId ?? null,
      enabledSourceTools: update.enabledSourceTools ?? create.enabledSourceTools ?? null,
      globalSystemPrompt: update.globalSystemPrompt ?? create.globalSystemPrompt ?? null,
      maxContextItems: update.maxContextItems ?? create.maxContextItems ?? 40,
      allowDrafts: update.allowDrafts ?? create.allowDrafts ?? true,
      updatedBy: update.updatedBy ?? create.updatedBy ?? null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    }))
    prismaMock.aiProviderProfile.findFirst.mockResolvedValue(null)
    prismaMock.aiProviderProfile.findMany.mockResolvedValue([])
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue(null)
    prismaMock.aiProviderProfile.update.mockResolvedValue({})
    prismaMock.aiProviderProfile.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.aiProviderCredential.findFirst.mockResolvedValue(null)
    prismaMock.aiProviderCredential.findMany.mockResolvedValue([])
    prismaMock.aiProviderCredential.create.mockImplementation(async ({ data, select }) => ({
      id: 'credential-created',
      label: data.label,
      isEnabled: true,
      lastUsedAt: null,
      failureCount: 0,
      disabledUntil: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      ...(select?.apiKeyEncrypted ? { apiKeyEncrypted: data.apiKeyEncrypted } : {}),
    }))
    prismaMock.aiProviderCredential.update.mockResolvedValue({})
    prismaMock.aiProviderCredential.delete.mockResolvedValue({})
    providerMock.callAiProvider.mockResolvedValue({
      text: 'Phản hồi mock',
      provider: 'MOCK',
      model: 'mock-construction-assistant',
    })
    providerMock.callAiProviderStream.mockImplementation(async (_profile, _prompt, handlers) => {
      await handlers.onDelta?.('Phản hồi ')
      await handlers.onDelta?.('stream')
      return {
        text: 'Phản hồi stream',
        provider: 'MOCK',
        model: 'mock-construction-assistant',
      }
    })
    providerMock.listAiProviderModels.mockResolvedValue([])
  })

  it('không cho user đọc thread private của người khác', async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'other-user',
      title: 'Thread riêng',
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(
      aiAssistantService.listMessages('project-1', 'thread-1', {
        userId: 'owner-user',
        permissions: basePermissions,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('không trả thread đã xóa mềm trong danh sách và không cho đọc message', async () => {
    await aiAssistantService.listThreads('project-1', {
      userId: 'owner-user',
      permissions: basePermissions,
    })

    expect(prismaMock.aiChatThread.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: 'project-1', deletedAt: null }),
      }),
    )

    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Thread đã xóa',
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(),
    })

    await expect(
      aiAssistantService.listMessages('project-1', 'thread-1', {
        userId: 'owner-user',
        permissions: basePermissions,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it.each(AI_DATA_SOURCE_IDS)('ẩn nội dung lịch sử assistant khi user mất quyền %s', async (sourceId) => {
    mockAccessibleThread()
    prismaMock.aiChatMessage.findMany.mockResolvedValue([
      makeAssistantMessage({
        contextSources: [{ toolId: sourceId, recordType: 'Bản ghi', recordId: `${sourceId.toLowerCase()}-1` }],
        toolCalls: [{ name: 'get_project_overview', sourceToolIds: [sourceId], status: 'EXECUTED' }],
        toolResults: [
          {
            name: 'get_project_overview',
            sourceToolIds: [sourceId],
            output: { secret: 'dữ liệu cần che' },
            sourceRefs: [{ toolId: sourceId, recordType: 'Bản ghi', recordId: `${sourceId.toLowerCase()}-1` }],
          },
        ],
      }),
    ])

    const messages = await aiAssistantService.listMessages('project-1', 'thread-1', {
      userId: 'owner-user',
      permissions: permissionsWith({ [sourceId]: 'NONE' }),
    })

    expect(messages[0].content).toBe(REDACTED_CONTENT)
    expect(messages[0].contextSources).toEqual([])
    expect(messages[0].toolCalls).toEqual([])
    expect(messages[0].toolResults).toEqual([])
  })

  it('giữ nội dung lịch sử assistant khi user vẫn còn quyền các nguồn đã dùng', async () => {
    const message = makeAssistantMessage({
      content: 'Tóm tắt công việc đang mở',
      contextSources: [{ toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' }],
      toolCalls: [{ name: 'list_overdue_tasks', sourceToolIds: ['TASK'], status: 'EXECUTED' }],
      toolResults: [
        {
          name: 'list_overdue_tasks',
          sourceToolIds: ['TASK'],
          output: { total: 1 },
          sourceRefs: [{ toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' }],
        },
      ],
    })
    mockAccessibleThread()
    prismaMock.aiChatMessage.findMany.mockResolvedValue([message])

    const messages = await aiAssistantService.listMessages('project-1', 'thread-1', {
      userId: 'owner-user',
      permissions: permissionsWith({ BUDGET: 'NONE' }),
    })

    expect(messages[0].content).toBe('Tóm tắt công việc đang mở')
    expect(messages[0].contextSources).toEqual(message.contextSources)
    expect(messages[0].toolCalls).toEqual(message.toolCalls)
    expect(messages[0].toolResults).toEqual(message.toolResults)
  })

  it('lọc metadata lịch sử theo từng nguồn và bỏ tool result lẫn nguồn bị cấm', async () => {
    mockAccessibleThread()
    prismaMock.aiChatMessage.findMany.mockResolvedValue([
      makeAssistantMessage({
        contextSources: [
          { toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' },
          { toolId: 'BUDGET', recordType: 'Hạng mục ngân sách', recordId: 'budget-1' },
        ],
        toolCalls: [
          { name: 'list_overdue_tasks', sourceToolIds: ['TASK'], status: 'EXECUTED' },
          { name: 'analyze_project_risks', sourceToolIds: ['TASK', 'BUDGET'], status: 'EXECUTED' },
        ],
        toolResults: [
          {
            name: 'list_overdue_tasks',
            sourceToolIds: ['TASK'],
            output: { total: 1 },
            sourceRefs: [{ toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' }],
          },
          {
            name: 'analyze_project_risks',
            sourceToolIds: ['TASK', 'BUDGET'],
            output: { budgetRisks: [{ id: 'budget-1' }] },
            sourceRefs: [
              { toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' },
              { toolId: 'BUDGET', recordType: 'Hạng mục ngân sách', recordId: 'budget-1' },
            ],
          },
        ],
      }),
    ])

    const messages = await aiAssistantService.listMessages('project-1', 'thread-1', {
      userId: 'owner-user',
      permissions: permissionsWith({ BUDGET: 'NONE' }),
    })

    expect(messages[0].content).toBe(REDACTED_CONTENT)
    expect(messages[0].contextSources).toEqual([{ toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' }])
    expect(messages[0].toolCalls).toEqual([{ name: 'list_overdue_tasks', sourceToolIds: ['TASK'], status: 'EXECUTED' }])
    expect(messages[0].toolResults).toEqual([
      {
        name: 'list_overdue_tasks',
        sourceToolIds: ['TASK'],
        output: { total: 1 },
        sourceRefs: [{ toolId: 'TASK', recordType: 'Công việc', recordId: 'task-1' }],
      },
    ])
  })

  it('vẫn lọc lịch sử cho AI admin nếu thiếu quyền đọc nguồn nghiệp vụ', async () => {
    mockAccessibleThread('other-user')
    prismaMock.aiChatMessage.findMany.mockResolvedValue([
      makeAssistantMessage({
        contextSources: [{ toolId: 'BUDGET', recordType: 'Hạng mục ngân sách', recordId: 'budget-1' }],
        toolCalls: [{ name: 'get_budget_summary', sourceToolIds: ['BUDGET'], status: 'EXECUTED' }],
        toolResults: [
          {
            name: 'get_budget_summary',
            sourceToolIds: ['BUDGET'],
            output: { spentCostTotal: 1000000 },
            sourceRefs: [{ toolId: 'BUDGET', recordType: 'Hạng mục ngân sách', recordId: 'budget-1' }],
          },
        ],
      }),
    ])

    const messages = await aiAssistantService.listMessages('project-1', 'thread-1', {
      userId: 'ai-admin',
      permissions: permissionsWith({ AI_ASSISTANT: 'ADMIN', BUDGET: 'NONE' }),
    })

    expect(messages[0].content).toBe(REDACTED_CONTENT)
    expect(messages[0].contextSources).toEqual([])
    expect(messages[0].toolCalls).toEqual([])
    expect(messages[0].toolResults).toEqual([])
  })

  it('giữ nguyên assistant message legacy không có metadata nguồn', async () => {
    mockAccessibleThread()
    prismaMock.aiChatMessage.findMany.mockResolvedValue([
      makeAssistantMessage({
        content: 'Nội dung legacy trước khi lưu metadata nguồn',
        contextSources: null,
        toolCalls: null,
        toolResults: null,
      }),
    ])

    const messages = await aiAssistantService.listMessages('project-1', 'thread-1', {
      userId: 'owner-user',
      permissions: permissionsWith({ BUDGET: 'NONE', WAREHOUSE: 'NONE' }),
    })

    expect(messages[0].content).toBe('Nội dung legacy trước khi lưu metadata nguồn')
    expect(messages[0].contextSources).toBeNull()
    expect(messages[0].toolCalls).toBeNull()
    expect(messages[0].toolResults).toBeNull()
  })

  it('cho owner đổi tên và xóa mềm thread AI', async () => {
    const thread = {
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Tên cũ',
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }
    prismaMock.aiChatThread.findUnique.mockResolvedValue(thread)
    prismaMock.aiChatThread.update.mockImplementation(async ({ data }) => ({ ...thread, ...data }))

    const updated = await aiAssistantService.updateThread({
      projectId: 'project-1',
      threadId: 'thread-1',
      title: 'Tên mới',
      actor: { userId: 'owner-user', permissions: basePermissions },
    })

    expect(updated.title).toBe('Tên mới')
    expect(prismaMock.aiChatThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: 'Tên mới' }) }),
    )

    const deleted = await aiAssistantService.deleteThread({
      projectId: 'project-1',
      threadId: 'thread-1',
      actor: { userId: 'owner-user', permissions: basePermissions },
    })

    expect(deleted).toEqual({ id: 'thread-1' })
    expect(prismaMock.aiChatThread.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    )
  })

  it('lưu assistant message lỗi khi provider thất bại mà không làm mất user message', async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Cuộc trò chuyện mới',
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    providerMock.callAiProvider.mockRejectedValue(new MockAiProviderCallError('AI_PROVIDER_NOT_CONFIGURED'))

    const result = await aiAssistantService.sendMessage({
      projectId: 'project-1',
      threadId: 'thread-1',
      userId: 'owner-user',
      content: 'Tóm tắt dự án tuần này',
      intent: 'CHAT',
      quickPromptPreset: 'WEEKLY_SUMMARY',
      permissions: basePermissions,
    })

    expect(result.userMessage.role).toBe('USER')
    expect(result.assistantMessage.role).toBe('ASSISTANT')
    expect(result.assistantMessage.errorCode).toBe('AI_PROVIDER_NOT_CONFIGURED')
    expect(result.assistantMessage.content).not.toContain('secret')
    expect(prismaMock.aiChatMessage.create).toHaveBeenCalledTimes(2)
  })

  it('stream message trả delta trước khi hoàn tất và vẫn lưu assistant message', async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Cuộc trò chuyện mới',
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })
    const userMessages: string[] = []
    const deltas: string[] = []

    const result = await aiAssistantService.streamMessage(
      {
        projectId: 'project-1',
        threadId: 'thread-1',
        userId: 'owner-user',
        content: 'Tóm tắt dự án dạng stream',
        intent: 'CHAT',
        quickPromptPreset: 'WEEKLY_SUMMARY',
        permissions: basePermissions,
        runId: 'run-stream',
      },
      {
        onUserMessage: (message) => {
          userMessages.push(message.content)
        },
        onAssistantDelta: (delta) => {
          deltas.push(delta)
        },
      },
    )

    expect(userMessages).toEqual(['Tóm tắt dự án dạng stream'])
    expect(deltas).toEqual(['Phản hồi ', 'stream'])
    expect(providerMock.callAiProviderStream).toHaveBeenCalled()
    expect(result.assistantMessage.content).toBe('Phản hồi stream')
  })

  it('dùng Cài đặt AI toàn hệ thống khi chat và không đọc ProjectAiSetting runtime', async () => {
    prismaMock.aiSystemSetting.findUnique.mockResolvedValue({
      id: 'global',
      defaultProviderProfileId: null,
      enabledSourceTools: ['PROJECT', 'TASK'],
      globalSystemPrompt: 'Luôn trả lời ngắn gọn.',
      maxContextItems: 12,
      allowDrafts: true,
      updatedBy: 'admin-user',
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Thread',
      providerProfileId: 'legacy-thread-profile',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    })

    const result = await aiAssistantService.sendMessage({
      projectId: 'project-1',
      threadId: 'thread-1',
      userId: 'owner-user',
      content: 'Tóm tắt dự án tuần này',
      intent: 'CHAT',
      quickPromptPreset: 'WEEKLY_SUMMARY',
      permissions: basePermissions,
    })

    expect(prismaMock.projectAiSetting.findUnique).not.toHaveBeenCalled()
    expect(aiToolsMock.runAiToolGateway).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        question: 'Tóm tắt dự án tuần này',
        quickPromptPreset: 'WEEKLY_SUMMARY',
        enabledSourceTools: ['PROJECT', 'TASK'],
        maxContextItems: 12,
      }),
    )
    expect(result.toolCalls).toEqual([expect.objectContaining({ name: 'get_project_overview', status: 'EXECUTED' })])
    expect(result.assistantMessage.toolCalls).toEqual([
      expect.objectContaining({ name: 'get_project_overview', status: 'EXECUTED' }),
    ])
  })

  it('system admin cập nhật Cài đặt AI toàn hệ thống', async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      name: 'Gemini',
      provider: 'GEMINI_DIRECT',
      baseUrl: null,
      model: 'gemini-2.5-flash',
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: false,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })

    const result = await aiAssistantService.updateSystemSettings({
      defaultProviderProfileId: 'profile-1',
      enabledSourceTools: ['PROJECT', 'TASK', 'WAREHOUSE'],
      globalSystemPrompt: 'Không bịa số liệu.',
      maxContextItems: 25,
      allowDrafts: false,
      actorUserId: 'admin-user',
    })

    expect(prismaMock.aiSystemSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'global' },
        update: expect.objectContaining({
          defaultProviderProfileId: 'profile-1',
          globalSystemPrompt: 'Không bịa số liệu.',
          maxContextItems: 25,
          allowDrafts: false,
          updatedBy: 'admin-user',
        }),
      }),
    )
    expect(result.defaultProviderProfileId).toBe('profile-1')
    expect(result.allowDrafts).toBe(false)
  })

  it('sửa user message, xóa mềm nhánh phía sau và gọi AI lại', async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Thread',
      providerProfileId: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      deletedAt: null,
    })
    prismaMock.aiChatMessage.findFirst.mockResolvedValue({
      id: 'message-user',
      threadId: 'thread-1',
      projectId: 'project-1',
      userId: 'owner-user',
      role: 'USER',
      content: 'Câu hỏi cũ',
      provider: null,
      model: null,
      latencyMs: null,
      contextSources: null,
      errorCode: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      editedAt: null,
      deletedAt: null,
    })
    providerMock.callAiProvider.mockResolvedValue({
      text: 'Câu trả lời mới',
      provider: 'MOCK',
      model: 'mock-construction-assistant',
    })

    const result = await aiAssistantService.updateMessage({
      projectId: 'project-1',
      threadId: 'thread-1',
      messageId: 'message-user',
      userId: 'owner-user',
      content: 'Câu hỏi đã sửa',
      rerun: true,
      permissions: basePermissions,
    })

    expect(prismaMock.aiChatMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          threadId: 'thread-1',
          deletedAt: null,
          createdAt: { gt: new Date('2026-05-07T00:00:00.000Z') },
        }),
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    )
    expect(prismaMock.aiChatMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'message-user' },
        data: expect.objectContaining({ content: 'Câu hỏi đã sửa', editedAt: expect.any(Date) }),
      }),
    )
    expect(result.assistantMessage.content).toBe('Câu trả lời mới')
  })

  it('retry dùng user message gần nhất và không tạo thêm user message mới', async () => {
    const userMessage = {
      id: 'message-user',
      threadId: 'thread-1',
      projectId: 'project-1',
      userId: 'owner-user',
      role: 'USER',
      content: 'Câu hỏi cần thử lại',
      provider: null,
      model: null,
      latencyMs: null,
      contextSources: null,
      errorCode: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      editedAt: null,
      deletedAt: null,
    }
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Thread',
      providerProfileId: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      deletedAt: null,
    })
    prismaMock.aiChatMessage.findFirst
      .mockResolvedValueOnce({
        id: 'message-assistant',
        threadId: 'thread-1',
        projectId: 'project-1',
        userId: null,
        role: 'ASSISTANT',
        content: 'Lỗi',
        provider: 'MOCK',
        model: 'mock-construction-assistant',
        latencyMs: 10,
        contextSources: null,
        errorCode: 'AI_PROVIDER_ERROR',
        createdAt: new Date('2026-05-07T00:01:00.000Z'),
        updatedAt: new Date('2026-05-07T00:01:00.000Z'),
        editedAt: null,
        deletedAt: null,
      })
      .mockResolvedValueOnce(userMessage)
    providerMock.callAiProvider.mockResolvedValue({
      text: 'Đã thử lại',
      provider: 'MOCK',
      model: 'mock-construction-assistant',
    })

    const result = await aiAssistantService.retryMessage({
      projectId: 'project-1',
      threadId: 'thread-1',
      messageId: 'message-assistant',
      userId: 'owner-user',
      permissions: basePermissions,
    })

    expect(result.userMessage.id).toBe('message-user')
    expect(result.assistantMessage.content).toBe('Đã thử lại')
    expect(prismaMock.aiChatMessage.create).toHaveBeenCalledTimes(1)
  })

  it('cancel run abort provider thật và lưu assistant message đã dừng', async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: 'thread-1',
      projectId: 'project-1',
      ownerId: 'owner-user',
      title: 'Thread',
      providerProfileId: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      deletedAt: null,
    })

    let providerStarted!: () => void
    const providerStartedPromise = new Promise<void>((resolve) => {
      providerStarted = resolve
    })
    providerMock.callAiProvider.mockImplementation((_profile, _prompt, options) => {
      providerStarted()
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new MockAiProviderCallError('AI_PROVIDER_ABORTED')), {
          once: true,
        })
      })
    })

    const sendPromise = aiAssistantService.sendMessage({
      projectId: 'project-1',
      threadId: 'thread-1',
      userId: 'owner-user',
      content: 'Dừng giúp tôi',
      intent: 'CHAT',
      permissions: basePermissions,
      runId: 'run-cancel',
    })

    await providerStartedPromise
    const cancelled = await aiAssistantService.cancelRun({
      projectId: 'project-1',
      runId: 'run-cancel',
      actor: { userId: 'owner-user', permissions: basePermissions },
    })
    const result = await sendPromise

    expect(cancelled).toEqual({ runId: 'run-cancel', cancelled: true })
    expect(result.assistantMessage.errorCode).toBe('AI_PROVIDER_ABORTED')
    expect(result.assistantMessage.content).toContain('Đã dừng')
  })

  it('tạo credential pool, bỏ qua key trùng và không lưu plaintext', async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      name: 'Gemini',
      provider: 'GEMINI_DIRECT',
      baseUrl: null,
      model: 'gemini-2.5-flash',
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: true,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    prismaMock.aiProviderCredential.findMany.mockImplementationOnce(async ({ where }) => [
      { keyHash: where.keyHash.in[0] },
    ])

    const result = await aiAssistantService.createProviderCredentials({
      providerProfileId: 'profile-1',
      keys: ['sk-existing-key-123', 'sk-new-key-456'],
      actorUserId: 'admin-user',
    })

    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.credentials[0].maskedKey).toBe('sk-new...-456')

    const createCall = prismaMock.aiProviderCredential.create.mock.calls[0][0]
    expect(createCall.data.apiKeyEncrypted).not.toContain('sk-new-key-456')
    expect(createCall.data.keyHash).not.toBe('sk-new-key-456')
  })

  it('chỉ trả key đã mask khi list credential', async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      name: 'OpenAI',
      provider: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://models.github.ai/inference/v1',
      model: 'openai/gpt-4.1-mini',
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: false,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    prismaMock.aiProviderCredential.findMany.mockResolvedValue([
      {
        id: 'credential-1',
        label: 'Key chính',
        apiKeyEncrypted: encryptSecret('sk-secret-value-123456'),
        isEnabled: true,
        lastUsedAt: null,
        failureCount: 0,
        disabledUntil: null,
        createdAt: new Date('2026-05-07T00:00:00.000Z'),
        updatedAt: new Date('2026-05-07T00:00:00.000Z'),
      },
    ])

    const result = await aiAssistantService.listProviderCredentials('profile-1')

    expect(result).toEqual([
      expect.objectContaining({
        id: 'credential-1',
        label: 'Key chính',
        maskedKey: 'sk-sec...3456',
      }),
    ])
    expect(JSON.stringify(result)).not.toContain('sk-secret-value-123456')
    expect(JSON.stringify(result)).not.toContain('apiKeyEncrypted')
  })

  it('export credential trả plaintext ở service để route system admin kiểm soát quyền', async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      name: 'Gemini',
      provider: 'GEMINI_DIRECT',
      baseUrl: null,
      model: 'gemini-2.5-flash',
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: true,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    prismaMock.aiProviderCredential.findMany.mockResolvedValue([
      {
        id: 'credential-1',
        label: 'Gemini 1',
        apiKeyEncrypted: encryptSecret('AIza-test-key-123456'),
        createdAt: new Date('2026-05-07T00:00:00.000Z'),
      },
    ])

    const result = await aiAssistantService.exportProviderCredentials({
      providerProfileId: 'profile-1',
      confirmation: 'EXPORT_PLAINTEXT_AI_KEYS',
      actorUserId: 'admin-user',
    })

    expect(result.keys).toEqual([{ id: 'credential-1', label: 'Gemini 1', apiKey: 'AIza-test-key-123456' }])
  })

  it('dùng credential đang bật và chưa bị tạm khóa khi lấy danh sách model', async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      name: 'OpenAI compatible',
      provider: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://models.github.ai/inference/v1',
      model: 'openai/gpt-4.1-mini',
      apiKeyEncrypted: null,
      config: { modelsPath: '/models' },
      isEnabled: true,
      isDefault: false,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    prismaMock.aiProviderCredential.findFirst.mockResolvedValue({
      id: 'credential-live',
      providerProfileId: 'profile-1',
      label: 'Key còn hiệu lực',
      apiKeyEncrypted: encryptSecret('sk-live-key-123456'),
      isEnabled: true,
      lastUsedAt: null,
      failureCount: 0,
      disabledUntil: null,
      createdAt: new Date('2026-05-07T00:00:00.000Z'),
      updatedAt: new Date('2026-05-07T00:00:00.000Z'),
    })
    providerMock.listAiProviderModels.mockResolvedValue([
      { id: 'openai/gpt-4.1-mini', label: 'GPT 4.1 Mini', source: 'OPENAI_COMPATIBLE' },
    ])

    const result = await aiAssistantService.listProviderModels('profile-1')

    expect(prismaMock.aiProviderCredential.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isEnabled: true,
          OR: expect.arrayContaining([{ disabledUntil: null }]),
        }),
      }),
    )
    expect(providerMock.listAiProviderModels).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialId: 'credential-live',
        apiKey: 'sk-live-key-123456',
      }),
    )
    expect(result.models).toHaveLength(1)
  })

  it('lấy danh sách model từ cấu hình provider nháp mà không cần lưu provider trước', async () => {
    providerMock.listAiProviderModels.mockResolvedValue([
      { id: 'openai/gpt-4.1-mini', label: 'GPT 4.1 Mini', source: 'OPENAI_COMPATIBLE' },
    ])

    const result = await aiAssistantService.listProviderModelsFromConfig({
      provider: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://ag.beijixingxing.com/v1',
      model: 'openai/gpt-4.1-mini',
      apiKey: 'sk-draft-key-123456',
      config: { modelsPath: '/models' },
    })

    expect(result.providerProfileId).toBe('test')
    expect(result.models).toHaveLength(1)
    expect(providerMock.listAiProviderModels).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test',
        apiKey: 'sk-draft-key-123456',
        config: { modelsPath: '/models' },
      }),
    )
    expect(prismaMock.aiProviderProfile.findUnique).not.toHaveBeenCalled()
  })

  it('provider test trả lỗi có kiểm soát và không lộ API key', async () => {
    providerMock.callAiProvider.mockRejectedValue(new MockAiProviderCallError('AI_PROVIDER_HTTP_429'))

    const result = await aiAssistantService.testProvider({
      provider: 'OPENAI_COMPATIBLE',
      baseUrl: 'https://models.github.ai/inference/v1',
      model: 'openai/gpt-4.1-mini',
      apiKey: 'sk-sensitive-key-123456',
    })

    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('AI_PROVIDER_HTTP_429')
    expect(JSON.stringify(result)).not.toContain('sk-sensitive-key-123456')
  })
})

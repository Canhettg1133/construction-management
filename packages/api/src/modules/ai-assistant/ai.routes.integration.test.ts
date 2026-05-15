import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { TOOL_IDS, type PermissionLevel, type ToolPermissionMap } from '@construction/shared'
import { buildAuthCookie } from '../../test/request-test-helpers'

process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'mysql://test:test@localhost:3306/test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-test-jwt-secret-123'
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-123'
process.env.NODE_ENV = 'test'

const PROJECT_ID = '11111111-1111-1111-1111-111111111111'

function buildPermissionMap(level: PermissionLevel): ToolPermissionMap {
  return Object.fromEntries(TOOL_IDS.map((toolId) => [toolId, level])) as ToolPermissionMap
}

const permissionServiceMock = {
  getProjectMembership: vi.fn(async (userId: string, projectId: string) => ({
    projectId,
    userId,
    systemRole: userId === 'admin-user' ? 'ADMIN' : 'STAFF',
    projectRole: userId === 'admin-user' ? null : 'VIEWER',
    isMember: userId !== 'staff-user',
    isSystemAdmin: userId === 'admin-user',
  })),
  getUserProjectPermissions: vi.fn(async (userId: string, projectId: string) => {
    const isAdmin = userId === 'admin-user'
    const toolPermissions = buildPermissionMap(isAdmin ? 'ADMIN' : 'READ')
    if (userId === 'viewer-user') {
      toolPermissions.AI_ASSISTANT = 'NONE'
    }

    return {
      projectId,
      userId,
      systemRole: isAdmin ? 'ADMIN' : 'STAFF',
      projectRole: isAdmin ? null : 'VIEWER',
      toolPermissions,
      specialPrivileges: [],
      effectiveRole: {
        isAdmin,
        canManageMembers: isAdmin,
        canApproveSafety: false,
        canApproveQuality: false,
        canApproveBudget: false,
      },
    }
  }),
}

const aiAssistantServiceMock = {
  listThreads: vi.fn().mockResolvedValue([]),
  createThread: vi.fn().mockResolvedValue({ id: 'thread-1', title: 'Cuộc trò chuyện mới' }),
  updateThread: vi.fn().mockResolvedValue({ id: 'thread-1', title: 'Tên mới' }),
  deleteThread: vi.fn().mockResolvedValue({ id: 'thread-1' }),
  listMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue({
    runId: 'run-1',
    userMessage: { id: 'message-user', role: 'USER' },
    assistantMessage: { id: 'message-assistant', role: 'ASSISTANT', content: 'Mock' },
    contextSources: [],
    includedTools: [],
    omittedTools: [],
  }),
  streamMessage: vi.fn().mockImplementation(async (_input, callbacks) => {
    await callbacks.onUserMessage?.({ id: 'message-user', role: 'USER', content: 'Stream' })
    await callbacks.onAssistantDelta?.('Xin ')
    await callbacks.onAssistantDelta?.('chào')
    return {
      runId: 'run-stream',
      userMessage: { id: 'message-user', role: 'USER' },
      assistantMessage: { id: 'message-assistant', role: 'ASSISTANT', content: 'Xin chào' },
      contextSources: [],
      includedTools: [],
      omittedTools: [],
    }
  }),
  updateMessage: vi.fn().mockResolvedValue({
    runId: 'run-edit',
    userMessage: { id: 'message-user', role: 'USER', content: 'Đã sửa' },
    assistantMessage: { id: 'message-assistant-new', role: 'ASSISTANT', content: 'Mock' },
    contextSources: [],
    includedTools: [],
    omittedTools: [],
  }),
  retryMessage: vi.fn().mockResolvedValue({
    runId: 'run-retry',
    userMessage: { id: 'message-user', role: 'USER' },
    assistantMessage: { id: 'message-assistant-new', role: 'ASSISTANT', content: 'Mock' },
    contextSources: [],
    includedTools: [],
    omittedTools: [],
  }),
  cancelRun: vi.fn().mockResolvedValue({ runId: 'run-1', cancelled: true }),
  getSystemSettings: vi.fn().mockResolvedValue({
    id: 'global',
    enabledSourceTools: ['PROJECT', 'TASK'],
    globalSystemPrompt: 'Không bịa số liệu.',
    defaultProviderProfileId: 'profile-1',
    maxContextItems: 40,
    allowDrafts: true,
    availableProviderProfiles: [],
  }),
  updateSystemSettings: vi.fn().mockResolvedValue({
    id: 'global',
    enabledSourceTools: ['PROJECT', 'TASK'],
    globalSystemPrompt: 'Không bịa số liệu.',
    defaultProviderProfileId: 'profile-1',
    maxContextItems: 30,
    allowDrafts: false,
    availableProviderProfiles: [],
  }),
  getProjectSettings: vi.fn().mockResolvedValue({
    projectId: PROJECT_ID,
    enabledSourceTools: null,
    customSystemPrompt: '',
    defaultProviderProfileId: null,
    availableProviderProfiles: [],
  }),
  getProjectAiStatus: vi.fn().mockResolvedValue({
    projectId: PROJECT_ID,
    providerProfile: {
      id: 'profile-1',
      name: 'Gemini Direct',
      provider: 'GEMINI_DIRECT',
      model: 'gemini-2.5-flash',
      readonly: false,
    },
    displayText: 'Đang dùng: Gemini Direct · cấu hình bởi quản trị viên',
  }),
  updateProjectSettings: vi.fn(),
  listProviderProfiles: vi.fn().mockResolvedValue([]),
  createProviderProfile: vi.fn(),
  updateProviderProfile: vi.fn(),
  listProviderModels: vi.fn().mockResolvedValue({ providerProfileId: 'profile-1', models: [] }),
  listProviderModelsFromConfig: vi.fn().mockResolvedValue({
    providerProfileId: 'test',
    models: [{ id: 'openai/gpt-4.1-mini', label: 'GPT 4.1 Mini', source: 'OPENAI_COMPATIBLE' }],
  }),
  testProvider: vi.fn().mockResolvedValue({
    success: true,
    provider: 'MOCK',
    model: 'mock-construction-assistant',
    message: 'Kết nối nhà cung cấp AI hoạt động.',
  }),
  listProviderCredentials: vi.fn().mockResolvedValue([]),
  createProviderCredentials: vi.fn().mockResolvedValue({ added: 1, skipped: 0, credentials: [] }),
  updateProviderCredential: vi.fn().mockResolvedValue({ id: 'credential-1', maskedKey: 'sk-abc...xyz' }),
  deleteProviderCredential: vi.fn().mockResolvedValue({ id: 'credential-1' }),
  exportProviderCredentials: vi.fn().mockResolvedValue({
    providerProfileId: 'profile-1',
    keys: [{ id: 'credential-1', label: 'Key 1', apiKey: 'sk-secret' }],
  }),
}

vi.mock('../../shared/services/permission.service', () => ({
  permissionService: permissionServiceMock,
}))

vi.mock('./ai.service', () => ({
  aiAssistantService: aiAssistantServiceMock,
}))

const { default: app } = await import('../../app')

describe('AI assistant routes', () => {
  it('yêu cầu đăng nhập trước khi xem thread', async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)

    expect(res.status).toBe(401)
  })

  it('chặn member không có quyền AI_ASSISTANT', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set('Cookie', buildAuthCookie('VIEWER'))

    expect(res.status).toBe(403)
  })

  it('chặn user không thuộc dự án trước khi vào AI chat', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set('Cookie', buildAuthCookie('STAFF'))

    expect(res.status).toBe(403)
  })

  it('cho phép member có AI_ASSISTANT READ xem thread private của mình', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set('Cookie', buildAuthCookie('ENGINEER'))

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(aiAssistantServiceMock.listThreads).toHaveBeenCalled()
  })

  it('cho phép member có AI_ASSISTANT READ đổi tên và xóa mềm thread của mình', async () => {
    const renamed = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads/thread-1`)
      .set('Cookie', buildAuthCookie('ENGINEER'))
      .send({ title: 'Tên mới' })
    expect(renamed.status).toBe(200)
    expect(aiAssistantServiceMock.updateThread).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      threadId: 'thread-1',
      title: 'Tên mới',
      actor: expect.objectContaining({ userId: 'engineer-user' }),
    })

    const deleted = await request(app)
      .delete(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads/thread-1`)
      .set('Cookie', buildAuthCookie('ENGINEER'))
    expect(deleted.status).toBe(200)
    expect(aiAssistantServiceMock.deleteThread).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      threadId: 'thread-1',
      actor: expect.objectContaining({ userId: 'engineer-user' }),
    })
  })

  it('cho phép sửa, gửi lại, retry và dừng lượt gọi AI qua backend', async () => {
    const edited = await request(app)
      .patch(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads/thread-1/messages/message-user`)
      .set('Cookie', buildAuthCookie('ENGINEER'))
      .send({ content: 'Nội dung đã sửa', rerun: true, runId: 'run-edit' })
    expect(edited.status).toBe(200)
    expect(aiAssistantServiceMock.updateMessage).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      threadId: 'thread-1',
      messageId: 'message-user',
      userId: 'engineer-user',
      content: 'Nội dung đã sửa',
      rerun: true,
      permissions: expect.any(Object),
      runId: 'run-edit',
    })

    const retry = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads/thread-1/messages/message-assistant/retry`)
      .set('Cookie', buildAuthCookie('ENGINEER'))
      .send({ runId: 'run-retry' })
    expect(retry.status).toBe(200)
    expect(aiAssistantServiceMock.retryMessage).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      threadId: 'thread-1',
      messageId: 'message-assistant',
      userId: 'engineer-user',
      permissions: expect.any(Object),
      runId: 'run-retry',
    })

    const cancelled = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/ai-chat/runs/run-1/cancel`)
      .set('Cookie', buildAuthCookie('ENGINEER'))
    expect(cancelled.status).toBe(200)
    expect(aiAssistantServiceMock.cancelRun).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      runId: 'run-1',
      actor: expect.objectContaining({ userId: 'engineer-user' }),
    })
  })

  it('stream phản hồi AI qua SSE cho member có quyền READ', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads/thread-1/messages/stream`)
      .set('Cookie', buildAuthCookie('ENGINEER'))
      .send({ content: 'Stream giúp tôi', intent: 'CHAT', runId: 'run-stream' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(res.text).toContain('event: ready')
    expect(res.text).toContain('event: user_message')
    expect(res.text).toContain('event: delta')
    expect(res.text).toContain('event: done')
    expect(res.text).toContain('Xin ')
    expect(res.text).toContain('chào')
    expect(aiAssistantServiceMock.streamMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        threadId: 'thread-1',
        userId: 'engineer-user',
        content: 'Stream giúp tôi',
        runId: 'run-stream',
      }),
      expect.objectContaining({
        onUserMessage: expect.any(Function),
        onAssistantDelta: expect.any(Function),
      }),
    )
  })

  it('cho phép user có AI_ASSISTANT READ xem trạng thái provider đã được admin cấu hình', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/status`)
      .set('Cookie', buildAuthCookie('ENGINEER'))

    expect(res.status).toBe(200)
    expect(res.body.data.displayText).toContain('Gemini Direct')
    expect(JSON.stringify(res.body)).not.toContain('sk-secret')
  })

  it('chỉ system admin được quản lý provider profile toàn cục', async () => {
    const denied = await request(app).get('/api/v1/ai-provider-profiles').set('Cookie', buildAuthCookie('ENGINEER'))
    expect(denied.status).toBe(403)

    const allowed = await request(app).get('/api/v1/ai-provider-profiles').set('Cookie', buildAuthCookie('ADMIN'))
    expect(allowed.status).toBe(200)
  })

  it('chỉ system admin được export plaintext API key provider', async () => {
    const denied = await request(app)
      .post('/api/v1/ai-provider-profiles/profile-1/credentials/export')
      .set('Cookie', buildAuthCookie('ENGINEER'))
      .send({ confirmation: 'EXPORT_PLAINTEXT_AI_KEYS' })
    expect(denied.status).toBe(403)

    const allowed = await request(app)
      .post('/api/v1/ai-provider-profiles/profile-1/credentials/export')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ confirmation: 'EXPORT_PLAINTEXT_AI_KEYS' })
    expect(allowed.status).toBe(200)
    expect(aiAssistantServiceMock.exportProviderCredentials).toHaveBeenCalledWith({
      providerProfileId: 'profile-1',
      confirmation: 'EXPORT_PLAINTEXT_AI_KEYS',
      actorUserId: 'admin-user',
    })
  })

  it('chỉ system admin được lấy model và kiểm tra provider toàn cục', async () => {
    const denied = await request(app)
      .get('/api/v1/ai-provider-profiles/profile-1/models')
      .set('Cookie', buildAuthCookie('ENGINEER'))
    expect(denied.status).toBe(403)

    const models = await request(app)
      .get('/api/v1/ai-provider-profiles/profile-1/models')
      .set('Cookie', buildAuthCookie('ADMIN'))
    expect(models.status).toBe(200)

    const testResult = await request(app)
      .post('/api/v1/ai-provider-profiles/test')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({ provider: 'MOCK', model: 'mock-construction-assistant' })
    expect(testResult.status).toBe(200)
  })

  it('cho system admin lấy model từ cấu hình provider nháp trước khi lưu', async () => {
    const denied = await request(app)
      .post('/api/v1/ai-provider-profiles/models')
      .set('Cookie', buildAuthCookie('ENGINEER'))
      .send({
        provider: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://ag.beijixingxing.com/v1',
        model: 'gpt-4.1-mini',
        apiKey: 'sk-test-key',
        config: { modelsPath: '/models' },
      })
    expect(denied.status).toBe(403)

    const allowed = await request(app)
      .post('/api/v1/ai-provider-profiles/models')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({
        provider: 'OPENAI_COMPATIBLE',
        baseUrl: 'https://ag.beijixingxing.com/v1',
        model: 'gpt-4.1-mini',
        apiKey: 'sk-test-key',
        config: { modelsPath: '/models' },
      })
    expect(allowed.status).toBe(200)
    expect(allowed.body.data.models[0].id).toBe('openai/gpt-4.1-mini')
  })

  it('chỉ system admin được quản lý Cài đặt AI toàn hệ thống', async () => {
    const denied = await request(app).get('/api/v1/ai-settings').set('Cookie', buildAuthCookie('ENGINEER'))
    expect(denied.status).toBe(403)

    const allowedGet = await request(app).get('/api/v1/ai-settings').set('Cookie', buildAuthCookie('ADMIN'))
    expect(allowedGet.status).toBe(200)
    expect(allowedGet.body.data.id).toBe('global')

    const allowedPut = await request(app)
      .put('/api/v1/ai-settings')
      .set('Cookie', buildAuthCookie('ADMIN'))
      .send({
        enabledSourceTools: ['PROJECT', 'TASK'],
        globalSystemPrompt: 'Không bịa số liệu.',
        defaultProviderProfileId: 'profile-1',
        maxContextItems: 30,
        allowDrafts: false,
      })
    expect(allowedPut.status).toBe(200)
    expect(aiAssistantServiceMock.updateSystemSettings).toHaveBeenCalledWith({
      enabledSourceTools: ['PROJECT', 'TASK'],
      globalSystemPrompt: 'Không bịa số liệu.',
      defaultProviderProfileId: 'profile-1',
      maxContextItems: 30,
      allowDrafts: false,
      actorUserId: 'admin-user',
    })
  })
})

import api from '../../../config/api'
import type { ToolId } from '@construction/shared'

interface ApiSingleResponse<T> {
  success: true
  data: T
}

export type AiProviderType = 'MOCK' | 'OPENAI_RESPONSES' | 'OPENAI_COMPATIBLE' | 'GEMINI_DIRECT' | 'OLLAMA'

export type AiMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'
export type AiMessageIntent = 'CHAT' | 'DRAFT_DAILY_REPORT' | 'DRAFT_SAFETY_CHECKLIST' | 'DRAFT_QUALITY_CHECKLIST'

export type AiQuickPromptPreset =
  | 'WEEKLY_SUMMARY'
  | 'OVERDUE_TASKS'
  | 'SCHEDULE_RISK'
  | 'LOW_STOCK_CHECK'
  | 'SAFETY_QUALITY_SUMMARY'
  | 'DAILY_REPORT_DRAFT'

export type AiSourceToolId = Exclude<ToolId, 'AI_ASSISTANT'>

export const AI_SOURCE_TOOL_IDS: AiSourceToolId[] = [
  'PROJECT',
  'TASK',
  'DAILY_REPORT',
  'FILE',
  'DOCUMENT',
  'SAFETY',
  'QUALITY',
  'WAREHOUSE',
  'BUDGET',
]

export interface AiContextSource {
  toolId: AiSourceToolId
  recordType: string
  recordId: string
  title?: string
}

export interface AiOmittedTool {
  toolId: AiSourceToolId
  reason: 'NO_PERMISSION' | 'DISABLED'
}

export interface AiToolCallMeta {
  name: string
  sourceToolIds: AiSourceToolId[]
  status: 'EXECUTED' | 'OMITTED'
  omittedReason?: 'NO_PERMISSION' | 'DISABLED'
}

export interface AiToolResultMeta {
  name: string
  sourceToolIds: AiSourceToolId[]
  output: unknown
  sourceRefs: AiContextSource[]
}

export interface AiThread {
  id: string
  projectId: string
  ownerId: string
  title: string
  visibility: 'PRIVATE'
  providerProfileId?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  providerProfile?: {
    id: string
    name: string
    provider: AiProviderType
    model: string
  } | null
  _count?: { messages: number }
}

export interface AiMessage {
  id: string
  threadId: string
  projectId: string
  userId?: string | null
  role: AiMessageRole
  content: string
  provider?: string | null
  model?: string | null
  latencyMs?: number | null
  contextSources?: AiContextSource[] | null
  toolCalls?: AiToolCallMeta[] | null
  toolResults?: AiToolResultMeta[] | null
  omittedTools?: AiOmittedTool[] | null
  errorCode?: string | null
  createdAt: string
  updatedAt?: string
  editedAt?: string | null
  deletedAt?: string | null
  clientStatus?: 'pending' | 'stopped' | 'error'
}

export interface SendAiMessageResponse {
  runId?: string
  userMessage: AiMessage
  assistantMessage: AiMessage
  contextSources: AiContextSource[]
  includedTools: AiSourceToolId[]
  omittedTools: AiOmittedTool[]
  toolCalls?: AiToolCallMeta[]
  toolResults?: AiToolResultMeta[]
}

export interface SendAiMessageStreamCallbacks {
  onUserMessage?: (message: AiMessage) => void
  onAssistantDelta?: (delta: string) => void
}

export interface AiProviderProfile {
  id: string
  name: string
  provider: AiProviderType
  baseUrl?: string | null
  model: string
  config?: Record<string, unknown> | null
  isEnabled: boolean
  isDefault: boolean
  hasApiKey: boolean
  credentialCount?: number
  enabledCredentialCount?: number
  readonly: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export interface AiProviderCredential {
  id: string
  label: string
  maskedKey: string
  isEnabled: boolean
  lastUsedAt?: string | null
  failureCount: number
  disabledUntil?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface AiProviderModelOption {
  id: string
  label: string
  source: AiProviderType
}

export interface AiProviderModelsResponse {
  providerProfileId: string
  models: AiProviderModelOption[]
}

export interface AiProviderTestResponse {
  success: boolean
  provider: AiProviderType
  model: string
  latencyMs?: number
  errorCode?: string
  message: string
}

export interface ProjectAiStatus {
  projectId: string
  providerProfile: AiProviderProfile
  displayText: string
}

export interface ProjectAiSettings {
  projectId: string
  enabledSourceTools: AiSourceToolId[] | null
  customSystemPrompt: string
  defaultProviderProfileId?: string | null
  availableProviderProfiles: AiProviderProfile[]
}

function buildApiUrl(path: string) {
  const baseUrl = String(api.defaults.baseURL ?? import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/u, '')
  return `${baseUrl}${path}`
}

function parseStreamEvent(rawEvent: string) {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of rawEvent.split(/\r?\n/u)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  const dataText = dataLines.join('\n').trim()
  return {
    event,
    data: dataText ? JSON.parse(dataText) : null,
  }
}

async function readAiMessageStream(
  response: Response,
  callbacks: SendAiMessageStreamCallbacks = {},
): Promise<SendAiMessageResponse> {
  if (!response.body) {
    throw new Error('Trình duyệt không hỗ trợ đọc phản hồi stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneResult: SendAiMessageResponse | null = null

  const consumeEvent = (rawEvent: string) => {
    if (!rawEvent.trim()) {
      return
    }
    const { event, data } = parseStreamEvent(rawEvent)
    if (event === 'user_message' && data) {
      callbacks.onUserMessage?.(data as AiMessage)
      return
    }
    if (event === 'delta' && data && typeof (data as { text?: unknown }).text === 'string') {
      callbacks.onAssistantDelta?.((data as { text: string }).text)
      return
    }
    if (event === 'done' && data) {
      doneResult = data as SendAiMessageResponse
      return
    }
    if (event === 'error') {
      const message =
        data && typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message: string }).message
          : 'Không stream được phản hồi AI.'
      throw new Error(message)
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/u)
    buffer = events.pop() ?? ''
    events.forEach(consumeEvent)
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    consumeEvent(buffer)
  }

  if (!doneResult) {
    throw new Error('Phản hồi stream AI kết thúc nhưng thiếu dữ liệu hoàn tất.')
  }

  return doneResult as SendAiMessageResponse
}

export interface AiSystemSettings {
  id: string
  enabledSourceTools: AiSourceToolId[] | null
  globalSystemPrompt: string
  defaultProviderProfileId?: string | null
  maxContextItems: number
  allowDrafts: boolean
  updatedBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  availableProviderProfiles: AiProviderProfile[]
}

export interface ProviderProfilePayload {
  name: string
  provider: AiProviderType
  baseUrl?: string | null
  model: string
  apiKey?: string | null
  apiKeys?: string[] | null
  config?: Record<string, unknown> | null
  isEnabled?: boolean
  isDefault?: boolean
}

export const aiApi = {
  async listThreads(projectId: string) {
    const response = await api.get<ApiSingleResponse<AiThread[]>>(`/projects/${projectId}/ai-chat/threads`)
    return response.data.data
  },

  async createThread(projectId: string, payload: { title?: string }) {
    const response = await api.post<ApiSingleResponse<AiThread>>(`/projects/${projectId}/ai-chat/threads`, payload)
    return response.data.data
  },

  async updateThread(projectId: string, threadId: string, payload: { title: string }) {
    const response = await api.patch<ApiSingleResponse<AiThread>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}`,
      payload,
    )
    return response.data.data
  },

  async deleteThread(projectId: string, threadId: string) {
    const response = await api.delete<ApiSingleResponse<{ id: string }>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}`,
    )
    return response.data.data
  },

  async listMessages(projectId: string, threadId: string) {
    const response = await api.get<ApiSingleResponse<AiMessage[]>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}/messages`,
    )
    return response.data.data
  },

  async sendMessage(
    projectId: string,
    threadId: string,
    payload: { content: string; intent?: AiMessageIntent; quickPromptPreset?: AiQuickPromptPreset; runId?: string },
  ) {
    const response = await api.post<ApiSingleResponse<SendAiMessageResponse>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}/messages`,
      payload,
    )
    return response.data.data
  },

  async sendMessageStream(
    projectId: string,
    threadId: string,
    payload: { content: string; intent?: AiMessageIntent; quickPromptPreset?: AiQuickPromptPreset; runId?: string },
    callbacks: SendAiMessageStreamCallbacks = {},
  ) {
    const response = await fetch(buildApiUrl(`/projects/${projectId}/ai-chat/threads/${threadId}/messages/stream`), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': crypto.randomUUID(),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Không stream được phản hồi AI (${response.status}).`)
    }

    return readAiMessageStream(response, callbacks)
  },

  async updateMessage(
    projectId: string,
    threadId: string,
    messageId: string,
    payload: { content: string; rerun: true; runId?: string },
  ) {
    const response = await api.patch<ApiSingleResponse<SendAiMessageResponse>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}/messages/${messageId}`,
      payload,
    )
    return response.data.data
  },

  async retryMessage(projectId: string, threadId: string, messageId: string, payload?: { runId?: string }) {
    const response = await api.post<ApiSingleResponse<SendAiMessageResponse>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}/messages/${messageId}/retry`,
      payload ?? {},
    )
    return response.data.data
  },

  async cancelRun(projectId: string, runId: string) {
    const response = await api.post<ApiSingleResponse<{ runId: string; cancelled: boolean }>>(
      `/projects/${projectId}/ai-chat/runs/${runId}/cancel`,
    )
    return response.data.data
  },

  async getSystemSettings() {
    const response = await api.get<ApiSingleResponse<AiSystemSettings>>('/ai-settings')
    return response.data.data
  },

  async getProjectStatus(projectId: string) {
    const response = await api.get<ApiSingleResponse<ProjectAiStatus>>(`/projects/${projectId}/ai-chat/status`)
    return response.data.data
  },

  async updateSystemSettings(payload: Partial<AiSystemSettings>) {
    const response = await api.put<ApiSingleResponse<AiSystemSettings>>('/ai-settings', payload)
    return response.data.data
  },

  async listProviderProfiles() {
    const response = await api.get<ApiSingleResponse<AiProviderProfile[]>>('/ai-provider-profiles')
    return response.data.data
  },

  async createProviderProfile(payload: ProviderProfilePayload) {
    const response = await api.post<ApiSingleResponse<AiProviderProfile>>('/ai-provider-profiles', payload)
    return response.data.data
  },

  async updateProviderProfile(profileId: string, payload: Partial<ProviderProfilePayload> & { clearApiKey?: boolean }) {
    const response = await api.put<ApiSingleResponse<AiProviderProfile>>(`/ai-provider-profiles/${profileId}`, payload)
    return response.data.data
  },

  async listProviderModels(profileId: string) {
    const response = await api.get<ApiSingleResponse<AiProviderModelsResponse>>(
      `/ai-provider-profiles/${profileId}/models`,
    )
    return response.data.data
  },

  async listProviderModelsFromConfig(payload: Partial<ProviderProfilePayload>) {
    const response = await api.post<ApiSingleResponse<AiProviderModelsResponse>>(
      '/ai-provider-profiles/models',
      payload,
    )
    return response.data.data
  },

  async testProvider(payload: Partial<ProviderProfilePayload> & { profileId?: string }) {
    const response = await api.post<ApiSingleResponse<AiProviderTestResponse>>('/ai-provider-profiles/test', payload)
    return response.data.data
  },

  async listProviderCredentials(profileId: string) {
    const response = await api.get<ApiSingleResponse<AiProviderCredential[]>>(
      `/ai-provider-profiles/${profileId}/credentials`,
    )
    return response.data.data
  },

  async createProviderCredentials(profileId: string, payload: { keys: string | string[]; label?: string | null }) {
    const response = await api.post<
      ApiSingleResponse<{ added: number; skipped: number; credentials: AiProviderCredential[] }>
    >(`/ai-provider-profiles/${profileId}/credentials`, payload)
    return response.data.data
  },

  async updateProviderCredential(
    profileId: string,
    credentialId: string,
    payload: Partial<Pick<AiProviderCredential, 'label' | 'isEnabled'>>,
  ) {
    const response = await api.put<ApiSingleResponse<AiProviderCredential>>(
      `/ai-provider-profiles/${profileId}/credentials/${credentialId}`,
      payload,
    )
    return response.data.data
  },

  async deleteProviderCredential(profileId: string, credentialId: string) {
    const response = await api.delete<ApiSingleResponse<{ id: string }>>(
      `/ai-provider-profiles/${profileId}/credentials/${credentialId}`,
    )
    return response.data.data
  },

  async exportProviderCredentials(profileId: string) {
    const response = await api.post<
      ApiSingleResponse<{
        providerProfileId: string
        keys: Array<{ id: string; label: string; apiKey: string | null }>
      }>
    >(`/ai-provider-profiles/${profileId}/credentials/export`, { confirmation: 'EXPORT_PLAINTEXT_AI_KEYS' })
    return response.data.data
  },
}

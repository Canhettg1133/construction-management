import { randomUUID } from 'node:crypto'
import {
  AuditEntityType,
  Prisma,
  type AiChatMessage,
  type AiProviderCredential,
  type AiProviderProfile,
  type AiProviderType,
} from '@prisma/client'
import {
  hasMinPermission,
  type PermissionLevel,
  type ToolPermissionMap,
  type UserProjectPermissions,
} from '@construction/shared'
import { prisma } from '../../config/database'
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors'
import { auditService } from '../audit/audit.service'
import { encryptSecret, decryptSecret, hashSecret, maskSecret } from './ai.crypto'
import { parseEnabledSourceTools, type AiSourceToolId } from './ai.context'
import { canReadAiSource, isAiSourceId } from './ai.permissions'
import { buildAiPrompt, type AiMessageIntent } from './ai.prompt'
import { runAiToolGateway, type AiQuickPromptPreset } from './ai.tools'
import {
  AiProviderCallError,
  callAiProvider,
  callAiProviderStream,
  getEnvProviderProfile,
  listAiProviderModels,
  type AiProviderRuntimeProfile,
} from './ai.provider'

interface AiActor {
  userId: string
  permissions: UserProjectPermissions
}

interface CreateThreadInput {
  projectId: string
  ownerId: string
  title?: string
}

interface SendMessageInput {
  projectId: string
  threadId: string
  userId: string
  content: string
  intent: AiMessageIntent
  quickPromptPreset?: AiQuickPromptPreset | null
  permissions: UserProjectPermissions
  runId?: string
}

interface StreamMessageCallbacks {
  onUserMessage?: (message: AiChatMessage) => void | Promise<void>
  onAssistantDelta?: (delta: string) => void | Promise<void>
}

interface UpdateThreadInput {
  projectId: string
  threadId: string
  title: string
  actor: AiActor
}

interface DeleteThreadInput {
  projectId: string
  threadId: string
  actor: AiActor
}

interface UpdateMessageInput {
  projectId: string
  threadId: string
  messageId: string
  userId: string
  content: string
  rerun: boolean
  permissions: UserProjectPermissions
  runId?: string
}

interface RetryMessageInput {
  projectId: string
  threadId: string
  messageId: string
  userId: string
  permissions: UserProjectPermissions
  runId?: string
}

interface CancelRunInput {
  projectId: string
  runId: string
  actor: AiActor
}

interface UpdateProjectSettingsInput {
  projectId: string
  enabledSourceTools?: AiSourceToolId[] | null
  customSystemPrompt?: string | null
  defaultProviderProfileId?: string | null
  actorUserId?: string
}

interface UpdateSystemSettingsInput {
  enabledSourceTools?: AiSourceToolId[] | null
  globalSystemPrompt?: string | null
  defaultProviderProfileId?: string | null
  maxContextItems?: number | null
  allowDrafts?: boolean
  actorUserId?: string
}

interface CreateProviderProfileInput {
  name: string
  provider: AiProviderType
  baseUrl?: string | null
  model: string
  apiKey?: string | null
  apiKeys?: string[] | null
  config?: Record<string, unknown> | null
  isEnabled?: boolean
  isDefault?: boolean
  actorUserId?: string
}

interface UpdateProviderProfileInput {
  id: string
  name?: string
  provider?: AiProviderType
  baseUrl?: string | null
  model?: string
  apiKey?: string | null
  apiKeys?: string[] | null
  clearApiKey?: boolean
  config?: Record<string, unknown> | null
  isEnabled?: boolean
  isDefault?: boolean
  actorUserId?: string
}

interface CreateProviderCredentialsInput {
  providerProfileId: string
  keys: string[] | string
  label?: string | null
  actorUserId?: string
}

interface UpdateProviderCredentialInput {
  providerProfileId: string
  credentialId: string
  label?: string
  isEnabled?: boolean
  actorUserId?: string
}

interface ExportProviderCredentialsInput {
  providerProfileId: string
  confirmation: string
  actorUserId?: string
}

interface ProviderTestInput {
  profileId?: string
  provider?: AiProviderType
  name?: string
  baseUrl?: string | null
  model?: string
  apiKey?: string | null
  config?: Record<string, unknown> | null
}

interface ActiveAiRun {
  projectId: string
  threadId: string
  userId: string
  controller: AbortController
  startedAt: Date
}

interface AssistantRunInput {
  projectId: string
  threadId: string
  userId: string
  threadTitle: string
  threadProviderProfileId?: string | null
  userMessage: AiChatMessage
  intent: AiMessageIntent
  quickPromptPreset?: AiQuickPromptPreset | null
  permissions: UserProjectPermissions
  runId?: string
  onProviderDelta?: (delta: string) => void | Promise<void>
}

const DEFAULT_THREAD_TITLE = 'Cuộc trò chuyện mới'
const GLOBAL_AI_SETTING_ID = 'global'
const DEFAULT_MAX_CONTEXT_ITEMS = 40
const REDACTED_AI_MESSAGE_CONTENT = '**Nội dung đã bị ẩn** vì quyền truy cập dữ liệu của bạn đã thay đổi.'
const activeAiRuns = new Map<string, ActiveAiRun>()

function isAiAdmin(permissions: UserProjectPermissions) {
  return (
    permissions.systemRole === 'ADMIN' ||
    hasMinPermission((permissions.toolPermissions.AI_ASSISTANT ?? 'NONE') as PermissionLevel, 'ADMIN')
  )
}

function assertDraftPermission(intent: AiMessageIntent, permissions: ToolPermissionMap) {
  if (intent === 'CHAT') {
    return
  }

  const level = (permissions.AI_ASSISTANT ?? 'NONE') as PermissionLevel
  if (!hasMinPermission(level, 'STANDARD')) {
    throw new ForbiddenError('Cần quyền STANDARD trên Trợ lý AI để tạo bản nháp')
  }
}

function isEnvProfileId(profileId: string | null | undefined) {
  return Boolean(profileId?.startsWith('env:'))
}

function readConfigObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function toNullableInputJson(value: unknown | null | undefined) {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return Prisma.JsonNull
  }
  return toInputJson(value)
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function isDeniedSourceId(value: unknown, permissions: ToolPermissionMap) {
  if (!isAiSourceId(value)) {
    return typeof value === 'string'
  }
  return !canReadAiSource(permissions, value)
}

function isReadableSourceRecord(value: unknown, permissions: ToolPermissionMap) {
  const record = asRecord(value)
  if (!record || !isAiSourceId(record.toolId)) {
    return false
  }
  return canReadAiSource(permissions, record.toolId)
}

function hasDeniedSourceRecord(value: unknown, permissions: ToolPermissionMap) {
  const record = asRecord(value)
  if (!record || !('toolId' in record)) {
    return false
  }
  return isDeniedSourceId(record.toolId, permissions)
}

function readSourceToolIds(value: unknown) {
  const record = asRecord(value)
  if (!record || !('sourceToolIds' in record)) {
    return null
  }
  const rawSourceIds = record.sourceToolIds
  if (!Array.isArray(rawSourceIds)) {
    return { ids: [] as AiSourceToolId[], hasInvalidSource: true }
  }
  const ids: AiSourceToolId[] = []
  let hasInvalidSource = false
  for (const sourceId of rawSourceIds) {
    if (isAiSourceId(sourceId)) {
      ids.push(sourceId)
    } else {
      hasInvalidSource = true
    }
  }
  return { ids, hasInvalidSource }
}

function hasDeniedToolMetadata(value: unknown, permissions: ToolPermissionMap) {
  const sourceIds = readSourceToolIds(value)
  if (sourceIds?.hasInvalidSource) {
    return true
  }
  if (sourceIds?.ids.some((sourceId) => !canReadAiSource(permissions, sourceId))) {
    return true
  }
  const sourceRefs = asArray(asRecord(value)?.sourceRefs)
  return sourceRefs?.some((sourceRef) => hasDeniedSourceRecord(sourceRef, permissions)) ?? false
}

function isReadableToolMetadata(value: unknown, permissions: ToolPermissionMap, requireSourceIds: boolean) {
  const sourceIds = readSourceToolIds(value)
  if (!sourceIds) {
    return !requireSourceIds
  }
  if (sourceIds.hasInvalidSource || sourceIds.ids.some((sourceId) => !canReadAiSource(permissions, sourceId))) {
    return false
  }
  const sourceRefs = asArray(asRecord(value)?.sourceRefs)
  return !sourceRefs?.some((sourceRef) => hasDeniedSourceRecord(sourceRef, permissions))
}

function filterContextSources(value: Prisma.JsonValue | null, permissions: ToolPermissionMap) {
  const items = asArray(value)
  if (!items) {
    return value
  }
  return items.filter((item) => isReadableSourceRecord(item, permissions))
}

function filterToolMetadata(value: Prisma.JsonValue | null, permissions: ToolPermissionMap, requireSourceIds: boolean) {
  const items = asArray(value)
  if (!items) {
    return value
  }
  return items.filter((item) => isReadableToolMetadata(item, permissions, requireSourceIds))
}

function shouldRedactAssistantMessage(message: AiChatMessage, permissions: ToolPermissionMap) {
  return Boolean(
    asArray(message.contextSources)?.some((item) => hasDeniedSourceRecord(item, permissions)) ||
    asArray(message.toolCalls)?.some((item) => hasDeniedToolMetadata(item, permissions)) ||
    asArray(message.toolResults)?.some((item) => hasDeniedToolMetadata(item, permissions)),
  )
}

function redactAiMessageForActor(message: AiChatMessage, permissions: ToolPermissionMap): AiChatMessage {
  if (message.role !== 'ASSISTANT') {
    return message
  }

  const shouldRedact = shouldRedactAssistantMessage(message, permissions)
  return {
    ...message,
    content: shouldRedact ? REDACTED_AI_MESSAGE_CONTENT : message.content,
    contextSources: filterContextSources(message.contextSources, permissions) as Prisma.JsonValue,
    toolCalls: filterToolMetadata(message.toolCalls, permissions, shouldRedact) as Prisma.JsonValue,
    toolResults: filterToolMetadata(message.toolResults, permissions, shouldRedact) as Prisma.JsonValue,
  }
}

type CredentialPublicFields = Pick<
  AiProviderCredential,
  'id' | 'label' | 'isEnabled' | 'lastUsedAt' | 'failureCount' | 'disabledUntil' | 'createdAt' | 'updatedAt'
>

type ProviderProfileWithCredentials = AiProviderProfile & {
  credentials?: CredentialPublicFields[]
}

function normalizeSecretCandidates(value: string[] | string | null | undefined) {
  const rawItems = Array.isArray(value) ? value : String(value ?? '').split(/[\s,;]+/u)
  return rawItems.map((item) => item.trim()).filter((item) => item.length >= 10)
}

function mergeSecretCandidates(input: { apiKey?: string | null; apiKeys?: string[] | null }) {
  return [...normalizeSecretCandidates(input.apiKey ?? null), ...normalizeSecretCandidates(input.apiKeys ?? null)]
}

function sanitizeCredential(credential: CredentialPublicFields & { apiKeyPlaintext?: string | null }) {
  return {
    id: credential.id,
    label: credential.label,
    maskedKey: maskSecret(credential.apiKeyPlaintext ?? null),
    isEnabled: credential.isEnabled,
    lastUsedAt: credential.lastUsedAt,
    failureCount: credential.failureCount,
    disabledUntil: credential.disabledUntil,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  }
}

function sanitizeProviderProfile(profile: ProviderProfileWithCredentials) {
  const credentials = profile.credentials ?? []
  const enabledCredentials = credentials.filter(
    (credential) => credential.isEnabled && (!credential.disabledUntil || credential.disabledUntil <= new Date()),
  )

  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    model: profile.model,
    config: readConfigObject(profile.config),
    isEnabled: profile.isEnabled,
    isDefault: profile.isDefault,
    hasApiKey: Boolean(profile.apiKeyEncrypted) || credentials.length > 0,
    credentialCount: credentials.length,
    enabledCredentialCount: enabledCredentials.length,
    readonly: false,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

function sanitizeEnvProviderProfile(profile: AiProviderRuntimeProfile) {
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    model: profile.model,
    config: profile.config ?? null,
    isEnabled: true,
    isDefault: false,
    hasApiKey: Boolean(profile.apiKey),
    readonly: true,
    createdAt: null,
    updatedAt: null,
  }
}

function toRuntimeProfile(profile: AiProviderProfile): AiProviderRuntimeProfile {
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    model: profile.model,
    apiKey: decryptSecret(profile.apiKeyEncrypted),
    config: readConfigObject(profile.config),
  }
}

async function selectAvailableCredential(providerProfileId: string) {
  const now = new Date()
  return prisma.aiProviderCredential.findFirst({
    where: {
      providerProfileId,
      isEnabled: true,
      OR: [{ disabledUntil: null }, { disabledUntil: { lte: now } }],
    },
    orderBy: [{ lastUsedAt: 'asc' }, { createdAt: 'asc' }],
  })
}

async function toRuntimeProfileWithCredential(profile: AiProviderProfile): Promise<AiProviderRuntimeProfile> {
  const credential = await selectAvailableCredential(profile.id)
  if (credential) {
    return {
      id: profile.id,
      name: profile.name,
      provider: profile.provider,
      baseUrl: profile.baseUrl,
      model: profile.model,
      apiKey: decryptSecret(credential.apiKeyEncrypted),
      config: readConfigObject(profile.config),
      credentialId: credential.id,
    }
  }

  return toRuntimeProfile(profile)
}

function toRuntimeProfileFromProviderInput(input: ProviderTestInput): AiProviderRuntimeProfile {
  return {
    id: 'test',
    name: input.name ?? 'Nhà cung cấp kiểm tra',
    provider: input.provider ?? 'MOCK',
    baseUrl: input.baseUrl ?? null,
    model: input.model ?? 'mock-construction-assistant',
    apiKey: input.apiKey ?? null,
    config: input.config ?? null,
  }
}

function shouldTemporarilyDisableCredential(code: string) {
  return ['AI_PROVIDER_HTTP_429', 'AI_PROVIDER_HTTP_503', 'AI_PROVIDER_HTTP_504'].includes(code)
}

function normalizeRunId(runId: string | null | undefined) {
  const normalized = runId?.trim()
  return normalized || randomUUID()
}

function registerAiRun(runId: string, run: ActiveAiRun) {
  if (activeAiRuns.has(runId)) {
    throw new BadRequestError('Mã lượt gọi AI đang được sử dụng, vui lòng thử lại')
  }

  activeAiRuns.set(runId, run)
  return () => {
    if (activeAiRuns.get(runId) === run) {
      activeAiRuns.delete(runId)
    }
  }
}

function assertNotAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw new AiProviderCallError('AI_PROVIDER_ABORTED')
  }
}

function isDefaultThreadTitle(title: string) {
  return title.trim() === DEFAULT_THREAD_TITLE
}

async function recordCredentialSuccess(profile: AiProviderRuntimeProfile) {
  if (!profile.credentialId) {
    return
  }

  await prisma.aiProviderCredential
    .update({
      where: { id: profile.credentialId },
      data: {
        lastUsedAt: new Date(),
        failureCount: 0,
        disabledUntil: null,
      },
    })
    .catch(() => undefined)
}

async function recordCredentialFailure(profile: AiProviderRuntimeProfile, code: string) {
  if (!profile.credentialId) {
    return
  }

  await prisma.aiProviderCredential
    .update({
      where: { id: profile.credentialId },
      data: {
        failureCount: { increment: 1 },
        disabledUntil: shouldTemporarilyDisableCredential(code) ? new Date(Date.now() + 10 * 60 * 1000) : undefined,
      },
    })
    .catch(() => undefined)
}

async function addCredentialsToProfile(input: CreateProviderCredentialsInput) {
  const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.providerProfileId } })
  if (!profile) {
    throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
  }

  const candidates = [...new Set(normalizeSecretCandidates(input.keys))]
  if (candidates.length === 0) {
    throw new BadRequestError('Không tìm thấy khóa API hợp lệ')
  }

  const hashes = candidates.map((key) => hashSecret(key))
  const existing = await prisma.aiProviderCredential.findMany({
    where: { providerProfileId: profile.id, keyHash: { in: hashes } },
    select: { keyHash: true },
  })
  const existingHashes = new Set(existing.map((item) => item.keyHash))
  const credentials: Array<CredentialPublicFields & { apiKeyPlaintext: string }> = []
  let skipped = 0

  for (const [index, key] of candidates.entries()) {
    const keyHash = hashes[index]
    if (existingHashes.has(keyHash)) {
      skipped += 1
      continue
    }

    const credential = await prisma.aiProviderCredential.create({
      data: {
        providerProfileId: profile.id,
        label:
          candidates.length === 1 && input.label?.trim()
            ? input.label.trim()
            : `Khóa ${credentials.length + existing.length + 1}`,
        apiKeyEncrypted: encryptSecret(key)!,
        keyHash,
      },
      select: {
        id: true,
        label: true,
        isEnabled: true,
        lastUsedAt: true,
        failureCount: true,
        disabledUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    credentials.push({ ...credential, apiKeyPlaintext: key })
  }

  if (credentials.length > 0) {
    await auditService.log({
      userId: input.actorUserId,
      action: 'CREATE',
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: profile.id,
      description: `Thêm ${credentials.length} khóa API cho nhà cung cấp AI ${profile.name}`,
    })
  }

  return {
    added: credentials.length,
    skipped,
    credentials: credentials.map((credential) => sanitizeCredential(credential)),
  }
}

async function ensureEnabledProviderProfile(profileId: string | null | undefined) {
  if (!profileId || isEnvProfileId(profileId)) {
    return null
  }

  const profile = await prisma.aiProviderProfile.findUnique({
    where: { id: profileId },
  })

  if (!profile || !profile.isEnabled) {
    throw new BadRequestError('Nhà cung cấp AI không tồn tại hoặc đã bị tắt')
  }

  return profile
}

async function getEffectiveSystemSetting() {
  const setting = await prisma.aiSystemSetting.findUnique({
    where: { id: GLOBAL_AI_SETTING_ID },
  })

  return {
    id: GLOBAL_AI_SETTING_ID,
    defaultProviderProfileId: setting?.defaultProviderProfileId ?? null,
    enabledSourceTools: parseEnabledSourceTools(setting?.enabledSourceTools ?? null),
    globalSystemPrompt: setting?.globalSystemPrompt ?? '',
    maxContextItems: setting?.maxContextItems ?? DEFAULT_MAX_CONTEXT_ITEMS,
    allowDrafts: setting?.allowDrafts ?? true,
    updatedBy: setting?.updatedBy ?? null,
    createdAt: setting?.createdAt ?? null,
    updatedAt: setting?.updatedAt ?? null,
  }
}

async function resolveProviderProfile() {
  const setting = await getEffectiveSystemSetting()

  if (setting.defaultProviderProfileId) {
    const profile = await ensureEnabledProviderProfile(setting.defaultProviderProfileId)
    if (profile) {
      return toRuntimeProfileWithCredential(profile)
    }
  }

  const defaultProfile = await prisma.aiProviderProfile.findFirst({
    where: { isEnabled: true, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (defaultProfile) {
    return toRuntimeProfileWithCredential(defaultProfile)
  }

  return getEnvProviderProfile()
}

async function ensureThreadAccess(projectId: string, threadId: string, actor: AiActor) {
  const thread = await prisma.aiChatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      projectId: true,
      ownerId: true,
      title: true,
      providerProfileId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
    },
  })

  if (!thread || thread.projectId !== projectId || thread.deletedAt) {
    throw new NotFoundError('Không tìm thấy cuộc trò chuyện AI')
  }

  if (thread.ownerId !== actor.userId && !isAiAdmin(actor.permissions)) {
    throw new ForbiddenError('Bạn không có quyền truy cập cuộc trò chuyện AI này')
  }

  return thread
}

async function softDeleteMessagesAfter(projectId: string, threadId: string, createdAt: Date) {
  await prisma.aiChatMessage.updateMany({
    where: {
      projectId,
      threadId,
      deletedAt: null,
      createdAt: { gt: createdAt },
    },
    data: { deletedAt: new Date() },
  })
}

async function findVisibleMessage(projectId: string, threadId: string, messageId: string) {
  const message = await prisma.aiChatMessage.findFirst({
    where: {
      id: messageId,
      projectId,
      threadId,
      deletedAt: null,
    },
  })

  if (!message) {
    throw new NotFoundError('Không tìm thấy tin nhắn AI')
  }

  return message
}

async function findUserMessageForRetry(projectId: string, threadId: string, message: AiChatMessage) {
  if (message.role === 'USER') {
    return message
  }

  const userMessage = await prisma.aiChatMessage.findFirst({
    where: {
      projectId,
      threadId,
      role: 'USER',
      deletedAt: null,
      createdAt: { lte: message.createdAt },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!userMessage) {
    throw new BadRequestError('Không tìm thấy câu hỏi người dùng để gửi lại')
  }

  return userMessage
}

async function runAssistantForUserMessage(input: AssistantRunInput) {
  assertDraftPermission(input.intent, input.permissions.toolPermissions)

  const runId = normalizeRunId(input.runId)
  const controller = new AbortController()
  const cleanupRun = registerAiRun(runId, {
    projectId: input.projectId,
    threadId: input.threadId,
    userId: input.userId,
    controller,
    startedAt: new Date(),
  })

  try {
    const setting = await getEffectiveSystemSetting()
    if (input.intent !== 'CHAT' && !setting.allowDrafts) {
      throw new ForbiddenError('Tạo bản nháp bằng Trợ lý AI đang bị tắt trong cấu hình toàn hệ thống')
    }

    assertNotAborted(controller.signal)

    const context = await runAiToolGateway({
      projectId: input.projectId,
      question: input.userMessage.content,
      intent: input.intent,
      quickPromptPreset: input.quickPromptPreset,
      permissions: input.permissions.toolPermissions,
      enabledSourceTools: setting.enabledSourceTools,
      maxContextItems: setting.maxContextItems,
    })

    assertNotAborted(controller.signal)

    const prompt = buildAiPrompt({
      question: input.userMessage.content,
      intent: input.intent,
      context,
      customSystemPrompt: setting.globalSystemPrompt,
      toolCalls: context.toolCalls,
      toolResults: context.toolResults,
    })

    const providerProfile = await resolveProviderProfile()
    const startedAt = Date.now()

    try {
      assertNotAborted(controller.signal)
      const providerResponse = input.onProviderDelta
        ? await callAiProviderStream(
            providerProfile,
            prompt,
            { onDelta: input.onProviderDelta },
            { signal: controller.signal },
          )
        : await callAiProvider(providerProfile, prompt, { signal: controller.signal })
      await recordCredentialSuccess(providerProfile)
      const latencyMs = Date.now() - startedAt
      const assistantMessage = await prisma.aiChatMessage.create({
        data: {
          projectId: input.projectId,
          threadId: input.threadId,
          userId: null,
          role: 'ASSISTANT',
          content: providerResponse.text,
          provider: providerResponse.provider,
          model: providerResponse.model,
          latencyMs,
          contextSources: toInputJson(context.sources),
          toolCalls: toInputJson(context.toolCalls),
          toolResults: toInputJson(context.toolResults),
          omittedTools: toInputJson(context.omittedTools),
        },
      })

      await prisma.aiChatThread.update({
        where: { id: input.threadId },
        data: {
          title: isDefaultThreadTitle(input.threadTitle) ? input.userMessage.content.slice(0, 120) : input.threadTitle,
          updatedAt: new Date(),
        },
      })

      return {
        runId,
        userMessage: input.userMessage,
        assistantMessage,
        contextSources: context.sources,
        includedTools: context.includedTools,
        omittedTools: context.omittedTools,
        toolCalls: context.toolCalls,
        toolResults: context.toolResults,
      }
    } catch (error) {
      if (!(error instanceof AiProviderCallError)) {
        throw error
      }

      const code = error.code
      if (code !== 'AI_PROVIDER_ABORTED') {
        await recordCredentialFailure(providerProfile, code)
      }
      const assistantMessage = await prisma.aiChatMessage.create({
        data: {
          projectId: input.projectId,
          threadId: input.threadId,
          userId: null,
          role: 'ASSISTANT',
          content:
            code === 'AI_PROVIDER_ABORTED'
              ? 'Đã dừng phản hồi của AI theo yêu cầu. Bạn có thể gửi lại hoặc chỉnh sửa câu hỏi.'
              : 'Không thể gọi nhà cung cấp AI ở thời điểm này. Câu hỏi của bạn đã được lưu, vui lòng kiểm tra cấu hình nhà cung cấp hoặc thử lại sau.',
          provider: providerProfile.provider,
          model: providerProfile.model,
          latencyMs: Date.now() - startedAt,
          contextSources: toInputJson(context.sources),
          toolCalls: toInputJson(context.toolCalls),
          toolResults: toInputJson(context.toolResults),
          omittedTools: toInputJson(context.omittedTools),
          errorCode: code,
        },
      })

      await prisma.aiChatThread.update({
        where: { id: input.threadId },
        data: { updatedAt: new Date() },
      })

      return {
        runId,
        userMessage: input.userMessage,
        assistantMessage,
        contextSources: context.sources,
        includedTools: context.includedTools,
        omittedTools: context.omittedTools,
        toolCalls: context.toolCalls,
        toolResults: context.toolResults,
      }
    }
  } finally {
    cleanupRun()
  }
}

async function normalizeDefaultProviderProfileId(profileId: string | null | undefined) {
  if (!profileId || isEnvProfileId(profileId)) {
    return null
  }

  await ensureEnabledProviderProfile(profileId)
  return profileId
}

export const aiAssistantService = {
  isAiAdmin,

  async getSystemSettings() {
    const [setting, profiles] = await Promise.all([getEffectiveSystemSetting(), this.listAvailableProviderProfiles()])

    return {
      id: setting.id,
      enabledSourceTools: setting.enabledSourceTools,
      globalSystemPrompt: setting.globalSystemPrompt,
      defaultProviderProfileId: setting.defaultProviderProfileId,
      maxContextItems: setting.maxContextItems,
      allowDrafts: setting.allowDrafts,
      updatedBy: setting.updatedBy,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
      availableProviderProfiles: profiles,
    }
  },

  async updateSystemSettings(input: UpdateSystemSettingsInput) {
    const defaultProviderProfileId = await normalizeDefaultProviderProfileId(input.defaultProviderProfileId)

    const createData: Prisma.AiSystemSettingUncheckedCreateInput = {
      id: GLOBAL_AI_SETTING_ID,
      enabledSourceTools: toNullableInputJson(input.enabledSourceTools ?? null),
      globalSystemPrompt: input.globalSystemPrompt ?? null,
      defaultProviderProfileId,
      maxContextItems: input.maxContextItems ?? DEFAULT_MAX_CONTEXT_ITEMS,
      allowDrafts: input.allowDrafts ?? true,
      updatedBy: input.actorUserId ?? null,
    }

    const updateData: Prisma.AiSystemSettingUncheckedUpdateInput = {
      ...(input.enabledSourceTools !== undefined && {
        enabledSourceTools: toNullableInputJson(input.enabledSourceTools),
      }),
      ...(input.globalSystemPrompt !== undefined && { globalSystemPrompt: input.globalSystemPrompt }),
      ...(input.defaultProviderProfileId !== undefined && { defaultProviderProfileId }),
      ...(input.maxContextItems !== undefined && {
        maxContextItems: input.maxContextItems ?? DEFAULT_MAX_CONTEXT_ITEMS,
      }),
      ...(input.allowDrafts !== undefined && { allowDrafts: input.allowDrafts }),
      updatedBy: input.actorUserId ?? null,
    }

    const setting = await prisma.aiSystemSetting.upsert({
      where: { id: GLOBAL_AI_SETTING_ID },
      create: createData,
      update: updateData,
    })

    await auditService.log({
      userId: input.actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_SYSTEM_SETTING,
      entityId: setting.id,
      description: 'Cập nhật Cài đặt AI toàn hệ thống',
    })

    return {
      id: setting.id,
      enabledSourceTools: parseEnabledSourceTools(setting.enabledSourceTools),
      globalSystemPrompt: setting.globalSystemPrompt ?? '',
      defaultProviderProfileId: setting.defaultProviderProfileId,
      maxContextItems: setting.maxContextItems,
      allowDrafts: setting.allowDrafts,
      updatedBy: setting.updatedBy,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
      availableProviderProfiles: await this.listAvailableProviderProfiles(),
    }
  },

  async listThreads(projectId: string, actor: AiActor) {
    const threads = await prisma.aiChatThread.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(isAiAdmin(actor.permissions) ? {} : { ownerId: actor.userId }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        projectId: true,
        ownerId: true,
        title: true,
        visibility: true,
        providerProfileId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        providerProfile: { select: { id: true, name: true, provider: true, model: true } },
        _count: { select: { messages: { where: { deletedAt: null } } } },
      },
    })

    return threads
  },

  async createThread(input: CreateThreadInput) {
    const thread = await prisma.aiChatThread.create({
      data: {
        projectId: input.projectId,
        ownerId: input.ownerId,
        title: input.title?.trim() || DEFAULT_THREAD_TITLE,
        visibility: 'PRIVATE',
        providerProfileId: null,
      },
    })

    return thread
  },

  async listMessages(projectId: string, threadId: string, actor: AiActor) {
    await ensureThreadAccess(projectId, threadId, actor)

    const messages = await prisma.aiChatMessage.findMany({
      where: { projectId, threadId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    return messages.map((message) => redactAiMessageForActor(message, actor.permissions.toolPermissions))
  },

  async sendMessage(input: SendMessageInput) {
    assertDraftPermission(input.intent, input.permissions.toolPermissions)

    const thread = await ensureThreadAccess(input.projectId, input.threadId, {
      userId: input.userId,
      permissions: input.permissions,
    })

    const userMessage = await prisma.aiChatMessage.create({
      data: {
        projectId: input.projectId,
        threadId: input.threadId,
        userId: input.userId,
        role: 'USER',
        content: input.content,
      },
    })

    return runAssistantForUserMessage({
      projectId: input.projectId,
      threadId: input.threadId,
      userId: input.userId,
      threadTitle: thread.title,
      threadProviderProfileId: thread.providerProfileId,
      userMessage,
      intent: input.intent,
      quickPromptPreset: input.quickPromptPreset,
      permissions: input.permissions,
      runId: input.runId,
    })
  },

  async streamMessage(input: SendMessageInput, callbacks: StreamMessageCallbacks = {}) {
    assertDraftPermission(input.intent, input.permissions.toolPermissions)

    const thread = await ensureThreadAccess(input.projectId, input.threadId, {
      userId: input.userId,
      permissions: input.permissions,
    })

    const userMessage = await prisma.aiChatMessage.create({
      data: {
        projectId: input.projectId,
        threadId: input.threadId,
        userId: input.userId,
        role: 'USER',
        content: input.content,
      },
    })
    await callbacks.onUserMessage?.(userMessage)

    return runAssistantForUserMessage({
      projectId: input.projectId,
      threadId: input.threadId,
      userId: input.userId,
      threadTitle: thread.title,
      threadProviderProfileId: thread.providerProfileId,
      userMessage,
      intent: input.intent,
      quickPromptPreset: input.quickPromptPreset,
      permissions: input.permissions,
      runId: input.runId,
      onProviderDelta: callbacks.onAssistantDelta,
    })
  },

  async updateThread(input: UpdateThreadInput) {
    const thread = await ensureThreadAccess(input.projectId, input.threadId, input.actor)
    const updated = await prisma.aiChatThread.update({
      where: { id: thread.id },
      data: {
        title: input.title.trim(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        projectId: true,
        ownerId: true,
        title: true,
        visibility: true,
        providerProfileId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        providerProfile: { select: { id: true, name: true, provider: true, model: true } },
        _count: { select: { messages: { where: { deletedAt: null } } } },
      },
    })

    await auditService.log({
      userId: input.actor.userId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_CHAT_THREAD,
      entityId: thread.id,
      description: `Đổi tên cuộc trò chuyện AI ${thread.id}`,
    })

    return updated
  },

  async deleteThread(input: DeleteThreadInput) {
    const thread = await ensureThreadAccess(input.projectId, input.threadId, input.actor)
    await prisma.aiChatThread.update({
      where: { id: thread.id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    await auditService.log({
      userId: input.actor.userId,
      action: 'DELETE',
      entityType: AuditEntityType.AI_CHAT_THREAD,
      entityId: thread.id,
      description: `Xóa mềm cuộc trò chuyện AI ${thread.id}`,
    })

    return { id: thread.id }
  },

  async updateMessage(input: UpdateMessageInput) {
    if (!input.rerun) {
      throw new BadRequestError('Sửa tin nhắn AI phải gửi lại từ điểm đã sửa')
    }

    const thread = await ensureThreadAccess(input.projectId, input.threadId, {
      userId: input.userId,
      permissions: input.permissions,
    })
    const message = await findVisibleMessage(input.projectId, input.threadId, input.messageId)

    if (message.role !== 'USER') {
      throw new BadRequestError('Chỉ có thể sửa tin nhắn của người dùng')
    }

    if (message.userId !== input.userId && !isAiAdmin(input.permissions)) {
      throw new ForbiddenError('Bạn không có quyền sửa tin nhắn AI này')
    }

    await softDeleteMessagesAfter(input.projectId, input.threadId, message.createdAt)

    const updatedUserMessage = await prisma.aiChatMessage.update({
      where: { id: message.id },
      data: {
        content: input.content.trim(),
        editedAt: new Date(),
      },
    })

    await auditService.log({
      userId: input.userId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_CHAT_MESSAGE,
      entityId: message.id,
      description: `Sửa và gửi lại tin nhắn AI ${message.id}`,
    })

    return runAssistantForUserMessage({
      projectId: input.projectId,
      threadId: input.threadId,
      userId: input.userId,
      threadTitle: thread.title,
      threadProviderProfileId: thread.providerProfileId,
      userMessage: updatedUserMessage,
      intent: 'CHAT',
      permissions: input.permissions,
      runId: input.runId,
    })
  },

  async retryMessage(input: RetryMessageInput) {
    const thread = await ensureThreadAccess(input.projectId, input.threadId, {
      userId: input.userId,
      permissions: input.permissions,
    })
    const message = await findVisibleMessage(input.projectId, input.threadId, input.messageId)
    const userMessage = await findUserMessageForRetry(input.projectId, input.threadId, message)

    if (userMessage.userId !== input.userId && !isAiAdmin(input.permissions)) {
      throw new ForbiddenError('Bạn không có quyền gửi lại tin nhắn AI này')
    }

    await softDeleteMessagesAfter(input.projectId, input.threadId, userMessage.createdAt)

    await auditService.log({
      userId: input.userId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_CHAT_MESSAGE,
      entityId: userMessage.id,
      description: `Gửi lại câu trả lời AI từ tin nhắn ${userMessage.id}`,
    })

    return runAssistantForUserMessage({
      projectId: input.projectId,
      threadId: input.threadId,
      userId: input.userId,
      threadTitle: thread.title,
      threadProviderProfileId: thread.providerProfileId,
      userMessage,
      intent: 'CHAT',
      permissions: input.permissions,
      runId: input.runId,
    })
  },

  async cancelRun(input: CancelRunInput) {
    const run = activeAiRuns.get(input.runId)
    if (!run || run.projectId !== input.projectId) {
      return { runId: input.runId, cancelled: false }
    }

    if (run.userId !== input.actor.userId && !isAiAdmin(input.actor.permissions)) {
      throw new ForbiddenError('Bạn không có quyền dừng lượt gọi AI này')
    }

    run.controller.abort()
    activeAiRuns.delete(input.runId)

    return { runId: input.runId, cancelled: true }
  },

  async getProjectSettings(projectId: string) {
    const [setting, profiles] = await Promise.all([
      prisma.projectAiSetting.findUnique({
        where: { projectId },
      }),
      this.listAvailableProviderProfiles(),
    ])

    return {
      projectId,
      enabledSourceTools: parseEnabledSourceTools(setting?.enabledSourceTools ?? null),
      customSystemPrompt: setting?.customSystemPrompt ?? '',
      defaultProviderProfileId: setting?.defaultProviderProfileId ?? null,
      availableProviderProfiles: profiles,
    }
  },

  async updateProjectSettings(input: UpdateProjectSettingsInput) {
    const defaultProviderProfileId = await normalizeDefaultProviderProfileId(input.defaultProviderProfileId)

    const createData: Prisma.ProjectAiSettingUncheckedCreateInput = {
      projectId: input.projectId,
      enabledSourceTools: toNullableInputJson(input.enabledSourceTools ?? null),
      customSystemPrompt: input.customSystemPrompt ?? null,
      defaultProviderProfileId,
    }

    const updateData: Prisma.ProjectAiSettingUncheckedUpdateInput = {
      ...(input.enabledSourceTools !== undefined && {
        enabledSourceTools: toNullableInputJson(input.enabledSourceTools),
      }),
      ...(input.customSystemPrompt !== undefined && { customSystemPrompt: input.customSystemPrompt }),
      ...(input.defaultProviderProfileId !== undefined && { defaultProviderProfileId }),
    }

    const setting = await prisma.projectAiSetting.upsert({
      where: { projectId: input.projectId },
      create: createData,
      update: updateData,
    })

    await auditService.log({
      userId: input.actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.PROJECT_AI_SETTING,
      entityId: setting.projectId,
      description: `Cập nhật cài đặt AI cho dự án ${setting.projectId}`,
    })

    return {
      projectId: setting.projectId,
      enabledSourceTools: parseEnabledSourceTools(setting.enabledSourceTools),
      customSystemPrompt: setting.customSystemPrompt ?? '',
      defaultProviderProfileId: setting.defaultProviderProfileId,
      availableProviderProfiles: await this.listAvailableProviderProfiles(),
    }
  },

  async listAvailableProviderProfiles() {
    const profiles = await prisma.aiProviderProfile.findMany({
      where: { isEnabled: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: {
        credentials: {
          select: {
            id: true,
            label: true,
            isEnabled: true,
            lastUsedAt: true,
            failureCount: true,
            disabledUntil: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    return [...profiles.map(sanitizeProviderProfile), sanitizeEnvProviderProfile(getEnvProviderProfile())]
  },

  async listProviderProfiles() {
    const profiles = await prisma.aiProviderProfile.findMany({
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: {
        credentials: {
          select: {
            id: true,
            label: true,
            isEnabled: true,
            lastUsedAt: true,
            failureCount: true,
            disabledUntil: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    return [...profiles.map(sanitizeProviderProfile), sanitizeEnvProviderProfile(getEnvProviderProfile())]
  },

  async createProviderProfile(input: CreateProviderProfileInput) {
    if (input.isDefault) {
      await prisma.aiProviderProfile.updateMany({ data: { isDefault: false } })
    }

    const profile = await prisma.aiProviderProfile.create({
      data: {
        name: input.name,
        provider: input.provider,
        baseUrl: input.baseUrl ?? null,
        model: input.model,
        apiKeyEncrypted: null,
        config: toNullableInputJson(input.config),
        isEnabled: input.isEnabled ?? true,
        isDefault: input.isDefault ?? false,
      },
    })

    const keys = mergeSecretCandidates(input)
    if (keys.length > 0) {
      await addCredentialsToProfile({
        providerProfileId: profile.id,
        keys,
        actorUserId: input.actorUserId,
      })
    }

    await auditService.log({
      userId: input.actorUserId,
      action: 'CREATE',
      entityType: AuditEntityType.AI_PROVIDER_PROFILE,
      entityId: profile.id,
      description: `Tạo nhà cung cấp AI ${profile.name}`,
    })

    const created = await prisma.aiProviderProfile.findUnique({
      where: { id: profile.id },
      include: {
        credentials: {
          select: {
            id: true,
            label: true,
            isEnabled: true,
            lastUsedAt: true,
            failureCount: true,
            disabledUntil: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    return sanitizeProviderProfile(created ?? profile)
  },

  async updateProviderProfile(input: UpdateProviderProfileInput) {
    const existing = await prisma.aiProviderProfile.findUnique({ where: { id: input.id } })
    if (!existing) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
    }

    if (input.isDefault) {
      await prisma.aiProviderProfile.updateMany({
        where: { id: { not: input.id } },
        data: { isDefault: false },
      })
    }

    if (input.clearApiKey === true) {
      await prisma.aiProviderCredential.deleteMany({ where: { providerProfileId: input.id } })
    }

    const profile = await prisma.aiProviderProfile.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.provider !== undefined && { provider: input.provider }),
        ...(input.baseUrl !== undefined && { baseUrl: input.baseUrl }),
        ...(input.model !== undefined && { model: input.model }),
        ...(input.clearApiKey === true && { apiKeyEncrypted: null }),
        ...(input.config !== undefined && { config: toNullableInputJson(input.config) }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    })

    const keys = mergeSecretCandidates(input)
    if (keys.length > 0) {
      await addCredentialsToProfile({
        providerProfileId: profile.id,
        keys,
        actorUserId: input.actorUserId,
      })
      await prisma.aiProviderProfile.update({
        where: { id: profile.id },
        data: { apiKeyEncrypted: null },
      })
    }

    await auditService.log({
      userId: input.actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_PROVIDER_PROFILE,
      entityId: profile.id,
      description: `Cập nhật nhà cung cấp AI ${profile.name}`,
    })

    const updated = await prisma.aiProviderProfile.findUnique({
      where: { id: profile.id },
      include: {
        credentials: {
          select: {
            id: true,
            label: true,
            isEnabled: true,
            lastUsedAt: true,
            failureCount: true,
            disabledUntil: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    return sanitizeProviderProfile(updated ?? profile)
  },

  async getProjectAiStatus(projectId: string) {
    const setting = await getEffectiveSystemSetting()
    const profileId = setting.defaultProviderProfileId
    const profile = profileId
      ? await prisma.aiProviderProfile.findUnique({
          where: { id: profileId },
          include: {
            credentials: {
              select: {
                id: true,
                label: true,
                isEnabled: true,
                lastUsedAt: true,
                failureCount: true,
                disabledUntil: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        })
      : await prisma.aiProviderProfile.findFirst({
          where: { isEnabled: true, isDefault: true },
          orderBy: { updatedAt: 'desc' },
          include: {
            credentials: {
              select: {
                id: true,
                label: true,
                isEnabled: true,
                lastUsedAt: true,
                failureCount: true,
                disabledUntil: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        })

    const effectiveProfile = profile
      ? sanitizeProviderProfile(profile)
      : sanitizeEnvProviderProfile(getEnvProviderProfile())
    return {
      projectId,
      providerProfile: effectiveProfile,
      displayText: `Đang dùng: ${effectiveProfile.name} · cấu hình toàn hệ thống`,
    }
  },

  async listProviderCredentials(providerProfileId: string) {
    const profile = await prisma.aiProviderProfile.findUnique({ where: { id: providerProfileId } })
    if (!profile) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
    }

    const credentials = await prisma.aiProviderCredential.findMany({
      where: { providerProfileId },
      orderBy: { createdAt: 'asc' },
    })

    const listed = credentials.map((credential) =>
      sanitizeCredential({
        ...credential,
        apiKeyPlaintext: decryptSecret(credential.apiKeyEncrypted),
      }),
    )

    if (profile.apiKeyEncrypted) {
      listed.unshift({
        id: 'legacy',
        label: 'Khóa cũ',
        maskedKey: maskSecret(decryptSecret(profile.apiKeyEncrypted)),
        isEnabled: true,
        lastUsedAt: null,
        failureCount: 0,
        disabledUntil: null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      })
    }

    return listed
  },

  async createProviderCredentials(input: CreateProviderCredentialsInput) {
    return addCredentialsToProfile(input)
  },

  async updateProviderCredential(input: UpdateProviderCredentialInput) {
    const credential = await prisma.aiProviderCredential.findFirst({
      where: { id: input.credentialId, providerProfileId: input.providerProfileId },
    })
    if (!credential) {
      throw new NotFoundError('Không tìm thấy khóa API AI')
    }

    const updated = await prisma.aiProviderCredential.update({
      where: { id: credential.id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
      },
      select: {
        id: true,
        label: true,
        isEnabled: true,
        lastUsedAt: true,
        failureCount: true,
        disabledUntil: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await auditService.log({
      userId: input.actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: updated.id,
      description: `Cập nhật khóa API AI ${updated.label}`,
    })

    return sanitizeCredential(updated)
  },

  async deleteProviderCredential(providerProfileId: string, credentialId: string, actorUserId?: string) {
    const credential = await prisma.aiProviderCredential.findFirst({
      where: { id: credentialId, providerProfileId },
    })
    if (!credential) {
      throw new NotFoundError('Không tìm thấy khóa API AI')
    }

    await prisma.aiProviderCredential.delete({ where: { id: credential.id } })
    await auditService.log({
      userId: actorUserId,
      action: 'DELETE',
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: credential.id,
      description: `Xóa khóa API AI ${credential.label}`,
    })

    return { id: credential.id }
  },

  async exportProviderCredentials(input: ExportProviderCredentialsInput) {
    if (input.confirmation !== 'EXPORT_PLAINTEXT_AI_KEYS') {
      throw new BadRequestError('Cần xác nhận trước khi xuất khóa API gốc')
    }

    const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.providerProfileId } })
    if (!profile) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
    }

    const credentials = await prisma.aiProviderCredential.findMany({
      where: { providerProfileId: profile.id },
      orderBy: { createdAt: 'asc' },
    })

    const exported = credentials.map((credential) => ({
      id: credential.id,
      label: credential.label,
      apiKey: decryptSecret(credential.apiKeyEncrypted),
    }))

    if (profile.apiKeyEncrypted) {
      exported.unshift({
        id: 'legacy',
        label: 'Khóa cũ',
        apiKey: decryptSecret(profile.apiKeyEncrypted),
      })
    }

    await auditService.log({
      userId: input.actorUserId,
      action: 'UPDATE',
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: profile.id,
      description: `Xuất khóa API dạng rõ của nhà cung cấp AI ${profile.name}`,
    })

    return { providerProfileId: profile.id, keys: exported }
  },

  async listProviderModels(profileId: string) {
    const profile = await prisma.aiProviderProfile.findUnique({ where: { id: profileId } })
    if (!profile) {
      throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
    }

    const runtimeProfile = await toRuntimeProfileWithCredential(profile)
    const models = await listAiProviderModels(runtimeProfile)
    const currentConfig = readConfigObject(profile.config) ?? {}
    await prisma.aiProviderProfile.update({
      where: { id: profile.id },
      data: {
        config: toInputJson({
          ...currentConfig,
          modelOptions: models,
          lastModelSyncAt: new Date().toISOString(),
        }),
      },
    })

    return { providerProfileId: profile.id, models }
  },

  async listProviderModelsFromConfig(input: ProviderTestInput) {
    const runtimeProfile = input.profileId
      ? await (async () => {
          const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.profileId } })
          if (!profile) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
          }
          return toRuntimeProfileWithCredential(profile)
        })()
      : toRuntimeProfileFromProviderInput(input)

    const models = await listAiProviderModels(runtimeProfile)
    return { providerProfileId: runtimeProfile.id, models }
  },

  async testProvider(input: ProviderTestInput) {
    const runtimeProfile = input.profileId
      ? await (async () => {
          const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.profileId } })
          if (!profile) {
            throw new NotFoundError('Không tìm thấy nhà cung cấp AI')
          }
          return toRuntimeProfileWithCredential(profile)
        })()
      : ({
          id: 'test',
          name: input.name ?? 'Nhà cung cấp kiểm tra',
          provider: input.provider ?? 'MOCK',
          baseUrl: input.baseUrl ?? null,
          model: input.model ?? 'mock-construction-assistant',
          apiKey: input.apiKey ?? null,
          config: input.config ?? null,
        } satisfies AiProviderRuntimeProfile)

    try {
      const startedAt = Date.now()
      const response = await callAiProvider(runtimeProfile, {
        system: 'Bạn là bộ kiểm tra kết nối. Trả lời ngắn gọn bằng tiếng Việt.',
        user: 'Hãy trả lời: Kết nối AI hoạt động.',
      })
      await recordCredentialSuccess(runtimeProfile)
      return {
        success: true,
        provider: response.provider,
        model: response.model,
        latencyMs: Date.now() - startedAt,
        message: 'Kết nối nhà cung cấp AI hoạt động.',
      }
    } catch (error) {
      const code = error instanceof AiProviderCallError ? error.code : 'AI_PROVIDER_ERROR'
      await recordCredentialFailure(runtimeProfile, code)
      return {
        success: false,
        provider: runtimeProfile.provider,
        model: runtimeProfile.model,
        errorCode: code,
        message:
          'Không kiểm tra được nhà cung cấp AI. Vui lòng kiểm tra khóa, mô hình, URL gốc hoặc trạng thái dịch vụ.',
      }
    }
  },
}

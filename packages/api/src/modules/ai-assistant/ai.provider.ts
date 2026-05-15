import type { AiProviderType } from '@prisma/client'
import { env } from '../../config/env'

export interface AiProviderRuntimeProfile {
  id: string
  name: string
  provider: AiProviderType
  baseUrl: string | null
  model: string
  apiKey: string | null
  config?: Record<string, unknown> | null
  readonly?: boolean
  credentialId?: string | null
}

export interface AiProviderRequest {
  system: string
  user: string
}

export interface AiProviderCallOptions {
  signal?: AbortSignal
}

export interface AiProviderResponse {
  text: string
  provider: AiProviderType
  model: string
}

export interface AiProviderStreamHandlers {
  onDelta?: (text: string) => void | Promise<void>
}

export interface AiProviderModelOption {
  id: string
  label: string
  source: AiProviderType
}

export class AiProviderCallError extends Error {
  public readonly code: string

  constructor(code: string, message = 'Không thể gọi nhà cung cấp AI') {
    super(message)
    this.code = code
  }
}

function assertApiKey(profile: AiProviderRuntimeProfile) {
  if (!profile.apiKey?.trim()) {
    throw new AiProviderCallError('AI_PROVIDER_NOT_CONFIGURED')
  }
  return profile.apiKey
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function readConfigString(profile: AiProviderRuntimeProfile, key: string, fallback: string) {
  const value = profile.config?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

async function requestJson(url: string, init: RequestInit) {
  const callerSignal = init.signal
  const timeoutSignal = AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS)
  const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal
  let response: Response

  try {
    response = await fetch(url, {
      ...init,
      signal,
    })
  } catch (error) {
    if (callerSignal?.aborted) {
      throw new AiProviderCallError('AI_PROVIDER_ABORTED')
    }
    if (timeoutSignal.aborted) {
      throw new AiProviderCallError('AI_PROVIDER_TIMEOUT')
    }
    throw error
  }

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { text }
    }
  }

  if (!response.ok) {
    throw new AiProviderCallError(`AI_PROVIDER_HTTP_${response.status}`)
  }

  return data
}

async function getJson(url: string, headers: Record<string, string>, signal?: AbortSignal) {
  return requestJson(url, {
    method: 'GET',
    headers,
    signal,
  })
}

async function postJson(url: string, body: unknown, headers: Record<string, string>, signal?: AbortSignal) {
  return requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
    signal,
  })
}

async function postJsonStream(url: string, body: unknown, headers: Record<string, string>, signal?: AbortSignal) {
  const callerSignal = signal
  const timeoutSignal = AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS)
  const combinedSignal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal
  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: combinedSignal,
    })
  } catch (error) {
    if (callerSignal?.aborted) {
      throw new AiProviderCallError('AI_PROVIDER_ABORTED')
    }
    if (timeoutSignal.aborted) {
      throw new AiProviderCallError('AI_PROVIDER_TIMEOUT')
    }
    throw error
  }

  if (!response.ok) {
    throw new AiProviderCallError(`AI_PROVIDER_HTTP_${response.status}`)
  }

  if (!response.body) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  return response.body
}

async function readTextStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: string, flush: boolean) => void | Promise<void>,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    await onChunk(decoder.decode(value, { stream: true }), false)
  }

  const rest = decoder.decode()
  if (rest) {
    await onChunk(rest, false)
  }
  await onChunk('', true)
}

async function readSseStream(body: ReadableStream<Uint8Array>, onData: (data: unknown) => void | Promise<void>) {
  let buffer = ''

  await readTextStream(body, async (chunk, flush) => {
    buffer += chunk
    const events = buffer.split(/\r?\n\r?\n/u)
    buffer = events.pop() ?? ''

    if (flush && buffer.trim()) {
      events.push(buffer)
      buffer = ''
    }

    for (const event of events) {
      const data = event
        .split(/\r?\n/u)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
        .trim()

      if (!data || data === '[DONE]') {
        continue
      }

      await onData(JSON.parse(data))
    }
  })
}

async function readNdjsonStream(body: ReadableStream<Uint8Array>, onData: (data: unknown) => void | Promise<void>) {
  let buffer = ''

  await readTextStream(body, async (chunk, flush) => {
    buffer += chunk
    const lines = buffer.split(/\r?\n/u)
    buffer = lines.pop() ?? ''

    if (flush && buffer.trim()) {
      lines.push(buffer)
      buffer = ''
    }

    for (const line of lines) {
      if (line.trim()) {
        await onData(JSON.parse(line))
      }
    }
  })
}

function readNestedString(value: unknown, path: string[]) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return null
    }
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : null
}

function extractTextFromResponsesApi(data: unknown) {
  if (data && typeof data === 'object' && 'output_text' in data) {
    const outputText = (data as { output_text?: unknown }).output_text
    if (typeof outputText === 'string' && outputText.trim()) {
      return outputText
    }
  }

  const output = data && typeof data === 'object' ? (data as { output?: unknown }).output : undefined
  if (Array.isArray(output)) {
    const parts: string[] = []
    for (const item of output) {
      const content = item && typeof item === 'object' ? (item as { content?: unknown }).content : undefined
      if (!Array.isArray(content)) {
        continue
      }
      for (const contentItem of content) {
        if (contentItem && typeof contentItem === 'object') {
          const text = (contentItem as { text?: unknown }).text
          if (typeof text === 'string') {
            parts.push(text)
          }
        }
      }
    }
    if (parts.length > 0) {
      return parts.join('\n').trim()
    }
  }

  throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
}

function extractTextFromChatCompletions(data: unknown) {
  const choices = data && typeof data === 'object' ? (data as { choices?: unknown }).choices : undefined
  if (Array.isArray(choices)) {
    const firstChoice = choices[0]
    const message =
      firstChoice && typeof firstChoice === 'object' ? (firstChoice as { message?: unknown }).message : undefined
    const content = message && typeof message === 'object' ? (message as { content?: unknown }).content : undefined
    if (typeof content === 'string' && content.trim()) {
      return content
    }
  }

  throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
}

function extractTextFromGemini(data: unknown) {
  const candidates = data && typeof data === 'object' ? (data as { candidates?: unknown }).candidates : undefined
  if (!Array.isArray(candidates)) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  const firstCandidate = candidates[0]
  const content =
    firstCandidate && typeof firstCandidate === 'object' ? (firstCandidate as { content?: unknown }).content : undefined
  const parts = content && typeof content === 'object' ? (content as { parts?: unknown }).parts : undefined
  if (!Array.isArray(parts)) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  const text = parts
    .map((part) => (part && typeof part === 'object' ? (part as { text?: unknown }).text : null))
    .filter((part): part is string => typeof part === 'string')
    .join('\n')
    .trim()

  if (!text) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  return text
}

function extractTextFromOllama(data: unknown) {
  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    const content = message && typeof message === 'object' ? (message as { content?: unknown }).content : undefined
    if (typeof content === 'string' && content.trim()) {
      return content
    }

    const response = (data as { response?: unknown }).response
    if (typeof response === 'string' && response.trim()) {
      return response
    }
  }

  throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
}

function normalizeModelId(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.replace(/^models\//, '').trim()
}

function toModelLabel(modelId: string) {
  return modelId
    .replace(/^gpt-/, 'GPT-')
    .replace(/^gemini-/, 'Gemini ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function uniqueModelOptions(items: AiProviderModelOption[]) {
  const byId = new Map<string, AiProviderModelOption>()
  for (const item of items) {
    if (item.id) {
      byId.set(item.id, item)
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}

function extractOpenAICompatibleModels(data: unknown, provider: AiProviderType) {
  const rawModels = data && typeof data === 'object' ? (data as { data?: unknown }).data : data
  if (!Array.isArray(rawModels)) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  return uniqueModelOptions(
    rawModels
      .map((item): AiProviderModelOption | null => {
        const id = normalizeModelId(
          typeof item === 'string' ? item : item && typeof item === 'object' ? (item as { id?: unknown }).id : '',
        )
        return id ? { id, label: toModelLabel(id), source: provider } : null
      })
      .filter((item): item is AiProviderModelOption => item !== null),
  )
}

function extractGeminiModels(data: unknown) {
  const models = data && typeof data === 'object' ? (data as { models?: unknown }).models : undefined
  if (!Array.isArray(models)) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  return uniqueModelOptions(
    models
      .map((item): AiProviderModelOption | null => {
        if (!item || typeof item !== 'object') {
          return null
        }
        const methods = (item as { supportedGenerationMethods?: unknown }).supportedGenerationMethods
        if (
          Array.isArray(methods) &&
          !methods.includes('generateContent') &&
          !methods.includes('streamGenerateContent')
        ) {
          return null
        }
        const id = normalizeModelId((item as { name?: unknown }).name)
        if (!id || !id.startsWith('gemini-')) {
          return null
        }
        const displayName = (item as { displayName?: unknown }).displayName
        return {
          id,
          label: typeof displayName === 'string' && displayName.trim() ? displayName.trim() : toModelLabel(id),
          source: 'GEMINI_DIRECT' as const,
        }
      })
      .filter((item): item is AiProviderModelOption => item !== null),
  )
}

function extractOllamaModels(data: unknown) {
  const models = data && typeof data === 'object' ? (data as { models?: unknown }).models : undefined
  if (!Array.isArray(models)) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }

  return uniqueModelOptions(
    models
      .map((item): AiProviderModelOption | null => {
        const id = normalizeModelId(
          typeof item === 'string' ? item : item && typeof item === 'object' ? (item as { name?: unknown }).name : '',
        )
        return id ? { id, label: id, source: 'OLLAMA' as const } : null
      })
      .filter((item): item is AiProviderModelOption => item !== null),
  )
}

function readPromptLine(prompt: string, prefix: string) {
  const line = prompt.split(/\r?\n/u).find((item) => item.trim().startsWith(prefix))
  return line?.slice(prefix.length).trim() || 'không có dữ liệu'
}

function buildMockResponse(request: AiProviderRequest) {
  const question = readPromptLine(request.user, 'Câu hỏi của người dùng:')
  const includedTools = readPromptLine(request.user, 'Phân hệ đã đưa vào kết quả công cụ/ngữ cảnh:')
  const omittedTools = readPromptLine(request.user, 'Phân hệ bị bỏ qua:')

  return [
    'Dựa trên dữ liệu hệ thống hiện có, đây là phản hồi mô phỏng của Trợ lý AI công trình.',
    '',
    'Phạm vi dữ liệu',
    `- Câu hỏi: ${question}`,
    `- Phân hệ đã dùng: ${includedTools}`,
    `- Phân hệ bị bỏ qua: ${omittedTools}`,
    '',
    'Nhận xét mô phỏng',
    '- Máy chủ đã lọc ngữ cảnh theo quyền người dùng trước khi gọi nhà cung cấp.',
    '- Chế độ MOCK không gọi AI thật nên không phân tích sâu nội dung dự án.',
    '- Để có câu trả lời tự nhiên và có phân tích, hãy cấu hình nhà cung cấp thật trong Cài đặt AI.',
    '',
    'Nguồn dữ liệu: kết quả công cụ máy chủ đã lọc theo quyền người dùng.',
  ].join('\n')
}

export function getEnvProviderProfile(): AiProviderRuntimeProfile {
  const provider = env.AI_PROVIDER
  if (provider === 'OPENAI_RESPONSES') {
    return {
      id: 'env:OPENAI_RESPONSES',
      name: 'OpenAI từ biến môi trường',
      provider,
      baseUrl: 'https://api.openai.com/v1',
      model: env.AI_OPENAI_MODEL,
      apiKey: env.AI_OPENAI_API_KEY ?? null,
      readonly: true,
    }
  }

  if (provider === 'OPENAI_COMPATIBLE') {
    return {
      id: 'env:OPENAI_COMPATIBLE',
      name: 'OpenAI-compatible từ biến môi trường',
      provider,
      baseUrl: env.AI_OPENAI_COMPATIBLE_BASE_URL ?? null,
      model: env.AI_OPENAI_COMPATIBLE_MODEL,
      apiKey: env.AI_OPENAI_COMPATIBLE_API_KEY ?? null,
      readonly: true,
    }
  }

  if (provider === 'GEMINI_DIRECT') {
    return {
      id: 'env:GEMINI_DIRECT',
      name: 'Gemini từ biến môi trường',
      provider,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: env.AI_GEMINI_MODEL,
      apiKey: env.AI_GEMINI_API_KEY ?? null,
      readonly: true,
    }
  }

  if (provider === 'OLLAMA') {
    return {
      id: 'env:OLLAMA',
      name: 'Ollama local từ biến môi trường',
      provider,
      baseUrl: env.AI_OLLAMA_BASE_URL,
      model: env.AI_OLLAMA_MODEL,
      apiKey: null,
      readonly: true,
    }
  }

  return {
    id: 'env:MOCK',
    name: 'Nhà cung cấp mô phỏng',
    provider: 'MOCK',
    baseUrl: null,
    model: 'mock-construction-assistant',
    apiKey: null,
    readonly: true,
  }
}

export async function listAiProviderModels(profile: AiProviderRuntimeProfile): Promise<AiProviderModelOption[]> {
  if (profile.provider === 'MOCK') {
    return [
      {
        id: profile.model || 'mock-construction-assistant',
        label: 'Mock construction assistant',
        source: 'MOCK',
      },
    ]
  }

  if (profile.provider === 'OPENAI_RESPONSES' || profile.provider === 'OPENAI_COMPATIBLE') {
    const apiKey = assertApiKey(profile)
    const baseUrl = profile.baseUrl ?? 'https://api.openai.com/v1'
    const modelsPath = readConfigString(profile, 'modelsPath', '/models')
    const data = await getJson(joinUrl(baseUrl, modelsPath), { Authorization: `Bearer ${apiKey}` })
    return extractOpenAICompatibleModels(data, profile.provider)
  }

  if (profile.provider === 'GEMINI_DIRECT') {
    const apiKey = assertApiKey(profile)
    const baseUrl = profile.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    const data = await getJson(`${joinUrl(baseUrl, '/models')}?key=${encodeURIComponent(apiKey)}`, {})
    return extractGeminiModels(data)
  }

  if (profile.provider === 'OLLAMA') {
    if (!profile.baseUrl) {
      throw new AiProviderCallError('AI_PROVIDER_NOT_CONFIGURED')
    }
    const data = await getJson(joinUrl(profile.baseUrl, '/api/tags'), {})
    return extractOllamaModels(data)
  }

  throw new AiProviderCallError('AI_PROVIDER_UNSUPPORTED')
}

async function emitDelta(handlers: AiProviderStreamHandlers, delta: string, parts: string[]) {
  if (!delta) {
    return
  }
  parts.push(delta)
  await handlers.onDelta?.(delta)
}

async function streamOpenAIResponses(
  profile: AiProviderRuntimeProfile,
  request: AiProviderRequest,
  handlers: AiProviderStreamHandlers,
  signal?: AbortSignal,
): Promise<AiProviderResponse> {
  const apiKey = assertApiKey(profile)
  const baseUrl = profile.baseUrl ?? 'https://api.openai.com/v1'
  const parts: string[] = []
  const body = await postJsonStream(
    joinUrl(baseUrl, '/responses'),
    {
      model: profile.model,
      stream: true,
      input: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
    },
    { Authorization: `Bearer ${apiKey}` },
    signal,
  )

  await readSseStream(body, async (data) => {
    if (!data || typeof data !== 'object') {
      return
    }
    const event = data as Record<string, unknown>
    if (event.type === 'error' || event.type === 'response.error') {
      throw new AiProviderCallError('AI_PROVIDER_ERROR')
    }
    if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
      await emitDelta(handlers, event.delta, parts)
    }
  })

  const text = parts.join('').trim()
  if (!text) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }
  return { provider: profile.provider, model: profile.model, text }
}

async function streamOpenAICompatible(
  profile: AiProviderRuntimeProfile,
  request: AiProviderRequest,
  handlers: AiProviderStreamHandlers,
  signal?: AbortSignal,
): Promise<AiProviderResponse> {
  const apiKey = assertApiKey(profile)
  if (!profile.baseUrl) {
    throw new AiProviderCallError('AI_PROVIDER_NOT_CONFIGURED')
  }
  const chatPath = readConfigString(profile, 'chatPath', '/chat/completions')
  const parts: string[] = []
  const body = await postJsonStream(
    joinUrl(profile.baseUrl, chatPath),
    {
      model: profile.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      stream: true,
    },
    { Authorization: `Bearer ${apiKey}` },
    signal,
  )

  await readSseStream(body, async (data) => {
    const choices = data && typeof data === 'object' ? (data as { choices?: unknown }).choices : undefined
    if (!Array.isArray(choices)) {
      return
    }
    const firstChoice = choices[0]
    const delta = readNestedString(firstChoice, ['delta', 'content'])
    if (delta) {
      await emitDelta(handlers, delta, parts)
    }
  })

  const text = parts.join('').trim()
  if (!text) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }
  return { provider: profile.provider, model: profile.model, text }
}

async function streamOllama(
  profile: AiProviderRuntimeProfile,
  request: AiProviderRequest,
  handlers: AiProviderStreamHandlers,
  signal?: AbortSignal,
): Promise<AiProviderResponse> {
  if (!profile.baseUrl) {
    throw new AiProviderCallError('AI_PROVIDER_NOT_CONFIGURED')
  }
  const parts: string[] = []
  const body = await postJsonStream(
    joinUrl(profile.baseUrl, '/api/chat'),
    {
      model: profile.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      stream: true,
    },
    {},
    signal,
  )

  await readNdjsonStream(body, async (data) => {
    if (!data || typeof data !== 'object') {
      return
    }
    const event = data as Record<string, unknown>
    if (typeof event.error === 'string') {
      throw new AiProviderCallError('AI_PROVIDER_ERROR')
    }
    const delta =
      readNestedString(event, ['message', 'content']) ?? (typeof event.response === 'string' ? event.response : null)
    if (delta) {
      await emitDelta(handlers, delta, parts)
    }
  })

  const text = parts.join('').trim()
  if (!text) {
    throw new AiProviderCallError('AI_PROVIDER_EMPTY_RESPONSE')
  }
  return { provider: profile.provider, model: profile.model, text }
}

export async function callAiProviderStream(
  profile: AiProviderRuntimeProfile,
  request: AiProviderRequest,
  handlers: AiProviderStreamHandlers = {},
  options: AiProviderCallOptions = {},
): Promise<AiProviderResponse> {
  if (profile.provider === 'OPENAI_RESPONSES') {
    return streamOpenAIResponses(profile, request, handlers, options.signal)
  }

  if (profile.provider === 'OPENAI_COMPATIBLE') {
    return streamOpenAICompatible(profile, request, handlers, options.signal)
  }

  if (profile.provider === 'OLLAMA') {
    return streamOllama(profile, request, handlers, options.signal)
  }

  const response = await callAiProvider(profile, request, options)
  await handlers.onDelta?.(response.text)
  return response
}

export async function callAiProvider(
  profile: AiProviderRuntimeProfile,
  request: AiProviderRequest,
  options: AiProviderCallOptions = {},
): Promise<AiProviderResponse> {
  if (profile.provider === 'MOCK') {
    return {
      provider: profile.provider,
      model: profile.model,
      text: buildMockResponse(request),
    }
  }

  if (profile.provider === 'OPENAI_RESPONSES') {
    const apiKey = assertApiKey(profile)
    const baseUrl = profile.baseUrl ?? 'https://api.openai.com/v1'
    const data = await postJson(
      joinUrl(baseUrl, '/responses'),
      {
        model: profile.model,
        input: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
      },
      { Authorization: `Bearer ${apiKey}` },
      options.signal,
    )

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromResponsesApi(data),
    }
  }

  if (profile.provider === 'OPENAI_COMPATIBLE') {
    const apiKey = assertApiKey(profile)
    if (!profile.baseUrl) {
      throw new AiProviderCallError('AI_PROVIDER_NOT_CONFIGURED')
    }
    const chatPath = readConfigString(profile, 'chatPath', '/chat/completions')
    const data = await postJson(
      joinUrl(profile.baseUrl, chatPath),
      {
        model: profile.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        stream: false,
      },
      { Authorization: `Bearer ${apiKey}` },
      options.signal,
    )

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromChatCompletions(data),
    }
  }

  if (profile.provider === 'GEMINI_DIRECT') {
    const apiKey = assertApiKey(profile)
    const baseUrl = profile.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    const data = await postJson(
      `${joinUrl(baseUrl, `/models/${profile.model}:generateContent`)}?key=${encodeURIComponent(apiKey)}`,
      {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.user }] }],
      },
      {},
      options.signal,
    )

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromGemini(data),
    }
  }

  if (profile.provider === 'OLLAMA') {
    if (!profile.baseUrl) {
      throw new AiProviderCallError('AI_PROVIDER_NOT_CONFIGURED')
    }
    const data = await postJson(
      joinUrl(profile.baseUrl, '/api/chat'),
      {
        model: profile.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.user },
        ],
        stream: false,
      },
      {},
      options.signal,
    )

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromOllama(data),
    }
  }

  throw new AiProviderCallError('AI_PROVIDER_UNSUPPORTED')
}

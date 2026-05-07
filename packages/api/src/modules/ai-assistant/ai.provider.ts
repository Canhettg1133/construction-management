import type { AiProviderType } from "@prisma/client";
import { env } from "../../config/env";

export interface AiProviderRuntimeProfile {
  id: string;
  name: string;
  provider: AiProviderType;
  baseUrl: string | null;
  model: string;
  apiKey: string | null;
  config?: Record<string, unknown> | null;
  readonly?: boolean;
  credentialId?: string | null;
}

export interface AiProviderRequest {
  system: string;
  user: string;
}

export interface AiProviderResponse {
  text: string;
  provider: AiProviderType;
  model: string;
}

export interface AiProviderModelOption {
  id: string;
  label: string;
  source: AiProviderType;
}

export class AiProviderCallError extends Error {
  public readonly code: string;

  constructor(code: string, message = "Không thể gọi nhà cung cấp AI") {
    super(message);
    this.code = code;
  }
}

function assertApiKey(profile: AiProviderRuntimeProfile) {
  if (!profile.apiKey?.trim()) {
    throw new AiProviderCallError("AI_PROVIDER_NOT_CONFIGURED");
  }
  return profile.apiKey;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readConfigString(profile: AiProviderRuntimeProfile, key: string, fallback: string) {
  const value = profile.config?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { text };
    }
  }

  if (!response.ok) {
    throw new AiProviderCallError(`AI_PROVIDER_HTTP_${response.status}`);
  }

  return data;
}

async function getJson(url: string, headers: Record<string, string>) {
  return requestJson(url, {
    method: "GET",
    headers,
  });
}

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  return requestJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function extractTextFromResponsesApi(data: unknown) {
  if (data && typeof data === "object" && "output_text" in data) {
    const outputText = (data as { output_text?: unknown }).output_text;
    if (typeof outputText === "string" && outputText.trim()) {
      return outputText;
    }
  }

  const output = data && typeof data === "object" ? (data as { output?: unknown }).output : undefined;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      const content = item && typeof item === "object" ? (item as { content?: unknown }).content : undefined;
      if (!Array.isArray(content)) {
        continue;
      }
      for (const contentItem of content) {
        if (contentItem && typeof contentItem === "object") {
          const text = (contentItem as { text?: unknown }).text;
          if (typeof text === "string") {
            parts.push(text);
          }
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
}

function extractTextFromChatCompletions(data: unknown) {
  const choices = data && typeof data === "object" ? (data as { choices?: unknown }).choices : undefined;
  if (Array.isArray(choices)) {
    const firstChoice = choices[0];
    const message = firstChoice && typeof firstChoice === "object" ? (firstChoice as { message?: unknown }).message : undefined;
    const content = message && typeof message === "object" ? (message as { content?: unknown }).content : undefined;
    if (typeof content === "string" && content.trim()) {
      return content;
    }
  }

  throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
}

function extractTextFromGemini(data: unknown) {
  const candidates = data && typeof data === "object" ? (data as { candidates?: unknown }).candidates : undefined;
  if (!Array.isArray(candidates)) {
    throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
  }

  const firstCandidate = candidates[0];
  const content = firstCandidate && typeof firstCandidate === "object" ? (firstCandidate as { content?: unknown }).content : undefined;
  const parts = content && typeof content === "object" ? (content as { parts?: unknown }).parts : undefined;
  if (!Array.isArray(parts)) {
    throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
  }

  const text = parts
    .map((part) => (part && typeof part === "object" ? (part as { text?: unknown }).text : null))
    .filter((part): part is string => typeof part === "string")
    .join("\n")
    .trim();

  if (!text) {
    throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
  }

  return text;
}

function extractTextFromOllama(data: unknown) {
  if (data && typeof data === "object") {
    const message = (data as { message?: unknown }).message;
    const content = message && typeof message === "object" ? (message as { content?: unknown }).content : undefined;
    if (typeof content === "string" && content.trim()) {
      return content;
    }

    const response = (data as { response?: unknown }).response;
    if (typeof response === "string" && response.trim()) {
      return response;
    }
  }

  throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
}

function normalizeModelId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/^models\//, "").trim();
}

function toModelLabel(modelId: string) {
  return modelId
    .replace(/^gpt-/, "GPT-")
    .replace(/^gemini-/, "Gemini ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function uniqueModelOptions(items: AiProviderModelOption[]) {
  const byId = new Map<string, AiProviderModelOption>();
  for (const item of items) {
    if (item.id) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function extractOpenAICompatibleModels(data: unknown, provider: AiProviderType) {
  const rawModels = data && typeof data === "object" ? (data as { data?: unknown }).data : data;
  if (!Array.isArray(rawModels)) {
    throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
  }

  return uniqueModelOptions(
    rawModels
      .map((item): AiProviderModelOption | null => {
        const id = normalizeModelId(
          typeof item === "string" ? item : item && typeof item === "object" ? (item as { id?: unknown }).id : ""
        );
        return id ? { id, label: toModelLabel(id), source: provider } : null;
      })
      .filter((item): item is AiProviderModelOption => item !== null)
  );
}

function extractGeminiModels(data: unknown) {
  const models = data && typeof data === "object" ? (data as { models?: unknown }).models : undefined;
  if (!Array.isArray(models)) {
    throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
  }

  return uniqueModelOptions(
    models
      .map((item): AiProviderModelOption | null => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const methods = (item as { supportedGenerationMethods?: unknown }).supportedGenerationMethods;
        if (
          Array.isArray(methods) &&
          !methods.includes("generateContent") &&
          !methods.includes("streamGenerateContent")
        ) {
          return null;
        }
        const id = normalizeModelId((item as { name?: unknown }).name);
        if (!id || !id.startsWith("gemini-")) {
          return null;
        }
        const displayName = (item as { displayName?: unknown }).displayName;
        return {
          id,
          label: typeof displayName === "string" && displayName.trim() ? displayName.trim() : toModelLabel(id),
          source: "GEMINI_DIRECT" as const,
        };
      })
      .filter((item): item is AiProviderModelOption => item !== null)
  );
}

function extractOllamaModels(data: unknown) {
  const models = data && typeof data === "object" ? (data as { models?: unknown }).models : undefined;
  if (!Array.isArray(models)) {
    throw new AiProviderCallError("AI_PROVIDER_EMPTY_RESPONSE");
  }

  return uniqueModelOptions(
    models
      .map((item): AiProviderModelOption | null => {
        const id = normalizeModelId(
          typeof item === "string" ? item : item && typeof item === "object" ? (item as { name?: unknown }).name : ""
        );
        return id ? { id, label: id, source: "OLLAMA" as const } : null;
      })
      .filter((item): item is AiProviderModelOption => item !== null)
  );
}

function readPromptLine(prompt: string, prefix: string) {
  const line = prompt
    .split(/\r?\n/u)
    .find((item) => item.trim().startsWith(prefix));
  return line?.slice(prefix.length).trim() || "không có dữ liệu";
}

function buildMockResponse(request: AiProviderRequest) {
  const question = readPromptLine(request.user, "Câu hỏi của người dùng:");
  const includedTools = readPromptLine(request.user, "Phân hệ đã đưa vào context:");
  const omittedTools = readPromptLine(request.user, "Phân hệ bị bỏ qua:");

  return [
    "Dựa trên dữ liệu hệ thống hiện có, đây là phản hồi mô phỏng của Trợ lý AI công trình.",
    "",
    "Phạm vi dữ liệu",
    `- Câu hỏi: ${question}`,
    `- Phân hệ đã dùng: ${includedTools}`,
    `- Phân hệ bị bỏ qua: ${omittedTools}`,
    "",
    "Nhận xét mô phỏng",
    "- Backend đã lọc context theo quyền người dùng trước khi gọi provider.",
    "- Chế độ MOCK không gọi AI thật nên không phân tích sâu nội dung dự án.",
    "- Để có câu trả lời tự nhiên và có phân tích, hãy cấu hình provider thật trong Cài đặt AI.",
    "",
    "Nguồn dữ liệu: context backend đã lọc theo quyền người dùng.",
  ].join("\n");
}

export function getEnvProviderProfile(): AiProviderRuntimeProfile {
  const provider = env.AI_PROVIDER;
  if (provider === "OPENAI_RESPONSES") {
    return {
      id: "env:OPENAI_RESPONSES",
      name: "OpenAI từ biến môi trường",
      provider,
      baseUrl: "https://api.openai.com/v1",
      model: env.AI_OPENAI_MODEL,
      apiKey: env.AI_OPENAI_API_KEY ?? null,
      readonly: true,
    };
  }

  if (provider === "OPENAI_COMPATIBLE") {
    return {
      id: "env:OPENAI_COMPATIBLE",
      name: "OpenAI-compatible từ biến môi trường",
      provider,
      baseUrl: env.AI_OPENAI_COMPATIBLE_BASE_URL ?? null,
      model: env.AI_OPENAI_COMPATIBLE_MODEL,
      apiKey: env.AI_OPENAI_COMPATIBLE_API_KEY ?? null,
      readonly: true,
    };
  }

  if (provider === "GEMINI_DIRECT") {
    return {
      id: "env:GEMINI_DIRECT",
      name: "Gemini từ biến môi trường",
      provider,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: env.AI_GEMINI_MODEL,
      apiKey: env.AI_GEMINI_API_KEY ?? null,
      readonly: true,
    };
  }

  if (provider === "OLLAMA") {
    return {
      id: "env:OLLAMA",
      name: "Ollama local từ biến môi trường",
      provider,
      baseUrl: env.AI_OLLAMA_BASE_URL,
      model: env.AI_OLLAMA_MODEL,
      apiKey: null,
      readonly: true,
    };
  }

  return {
    id: "env:MOCK",
    name: "Mock provider",
    provider: "MOCK",
    baseUrl: null,
    model: "mock-construction-assistant",
    apiKey: null,
    readonly: true,
  };
}

export async function listAiProviderModels(profile: AiProviderRuntimeProfile): Promise<AiProviderModelOption[]> {
  if (profile.provider === "MOCK") {
    return [
      {
        id: profile.model || "mock-construction-assistant",
        label: "Mock construction assistant",
        source: "MOCK",
      },
    ];
  }

  if (profile.provider === "OPENAI_RESPONSES" || profile.provider === "OPENAI_COMPATIBLE") {
    const apiKey = assertApiKey(profile);
    const baseUrl = profile.baseUrl ?? "https://api.openai.com/v1";
    const modelsPath = readConfigString(profile, "modelsPath", "/models");
    const data = await getJson(joinUrl(baseUrl, modelsPath), { Authorization: `Bearer ${apiKey}` });
    return extractOpenAICompatibleModels(data, profile.provider);
  }

  if (profile.provider === "GEMINI_DIRECT") {
    const apiKey = assertApiKey(profile);
    const baseUrl = profile.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    const data = await getJson(`${joinUrl(baseUrl, "/models")}?key=${encodeURIComponent(apiKey)}`, {});
    return extractGeminiModels(data);
  }

  if (profile.provider === "OLLAMA") {
    if (!profile.baseUrl) {
      throw new AiProviderCallError("AI_PROVIDER_NOT_CONFIGURED");
    }
    const data = await getJson(joinUrl(profile.baseUrl, "/api/tags"), {});
    return extractOllamaModels(data);
  }

  throw new AiProviderCallError("AI_PROVIDER_UNSUPPORTED");
}

export async function callAiProvider(
  profile: AiProviderRuntimeProfile,
  request: AiProviderRequest
): Promise<AiProviderResponse> {
  if (profile.provider === "MOCK") {
    return {
      provider: profile.provider,
      model: profile.model,
      text: buildMockResponse(request),
    };
  }

  if (profile.provider === "OPENAI_RESPONSES") {
    const apiKey = assertApiKey(profile);
    const baseUrl = profile.baseUrl ?? "https://api.openai.com/v1";
    const data = await postJson(
      joinUrl(baseUrl, "/responses"),
      {
        model: profile.model,
        input: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
      },
      { Authorization: `Bearer ${apiKey}` }
    );

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromResponsesApi(data),
    };
  }

  if (profile.provider === "OPENAI_COMPATIBLE") {
    const apiKey = assertApiKey(profile);
    if (!profile.baseUrl) {
      throw new AiProviderCallError("AI_PROVIDER_NOT_CONFIGURED");
    }
    const chatPath = readConfigString(profile, "chatPath", "/chat/completions");
    const data = await postJson(
      joinUrl(profile.baseUrl, chatPath),
      {
        model: profile.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        stream: false,
      },
      { Authorization: `Bearer ${apiKey}` }
    );

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromChatCompletions(data),
    };
  }

  if (profile.provider === "GEMINI_DIRECT") {
    const apiKey = assertApiKey(profile);
    const baseUrl = profile.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    const data = await postJson(
      `${joinUrl(baseUrl, `/models/${profile.model}:generateContent`)}?key=${encodeURIComponent(apiKey)}`,
      {
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.user }] }],
      },
      {}
    );

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromGemini(data),
    };
  }

  if (profile.provider === "OLLAMA") {
    if (!profile.baseUrl) {
      throw new AiProviderCallError("AI_PROVIDER_NOT_CONFIGURED");
    }
    const data = await postJson(
      joinUrl(profile.baseUrl, "/api/chat"),
      {
        model: profile.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        stream: false,
      },
      {}
    );

    return {
      provider: profile.provider,
      model: profile.model,
      text: extractTextFromOllama(data),
    };
  }

  throw new AiProviderCallError("AI_PROVIDER_UNSUPPORTED");
}

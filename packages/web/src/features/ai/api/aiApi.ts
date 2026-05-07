import api from "../../../config/api";
import type { ToolId } from "@construction/shared";

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export type AiProviderType =
  | "MOCK"
  | "OPENAI_RESPONSES"
  | "OPENAI_COMPATIBLE"
  | "GEMINI_DIRECT"
  | "OLLAMA";

export type AiMessageRole = "USER" | "ASSISTANT" | "SYSTEM";
export type AiMessageIntent =
  | "CHAT"
  | "DRAFT_DAILY_REPORT"
  | "DRAFT_SAFETY_CHECKLIST"
  | "DRAFT_QUALITY_CHECKLIST";

export type AiSourceToolId = Exclude<ToolId, "AI_ASSISTANT">;

export const AI_SOURCE_TOOL_IDS: AiSourceToolId[] = [
  "PROJECT",
  "TASK",
  "DAILY_REPORT",
  "FILE",
  "DOCUMENT",
  "SAFETY",
  "QUALITY",
  "WAREHOUSE",
  "BUDGET",
];

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

export interface AiThread {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  visibility: "PRIVATE";
  providerProfileId?: string | null;
  createdAt: string;
  updatedAt: string;
  providerProfile?: {
    id: string;
    name: string;
    provider: AiProviderType;
    model: string;
  } | null;
  _count?: { messages: number };
}

export interface AiMessage {
  id: string;
  threadId: string;
  projectId: string;
  userId?: string | null;
  role: AiMessageRole;
  content: string;
  provider?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  contextSources?: AiContextSource[] | null;
  errorCode?: string | null;
  createdAt: string;
}

export interface SendAiMessageResponse {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
  contextSources: AiContextSource[];
  includedTools: AiSourceToolId[];
  omittedTools: AiOmittedTool[];
}

export interface AiProviderProfile {
  id: string;
  name: string;
  provider: AiProviderType;
  baseUrl?: string | null;
  model: string;
  config?: Record<string, unknown> | null;
  isEnabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
  credentialCount?: number;
  enabledCredentialCount?: number;
  readonly: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AiProviderCredential {
  id: string;
  label: string;
  maskedKey: string;
  isEnabled: boolean;
  lastUsedAt?: string | null;
  failureCount: number;
  disabledUntil?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AiProviderModelOption {
  id: string;
  label: string;
  source: AiProviderType;
}

export interface AiProviderModelsResponse {
  providerProfileId: string;
  models: AiProviderModelOption[];
}

export interface AiProviderTestResponse {
  success: boolean;
  provider: AiProviderType;
  model: string;
  latencyMs?: number;
  errorCode?: string;
  message: string;
}

export interface ProjectAiStatus {
  projectId: string;
  providerProfile: AiProviderProfile;
  displayText: string;
}

export interface ProjectAiSettings {
  projectId: string;
  enabledSourceTools: AiSourceToolId[] | null;
  customSystemPrompt: string;
  defaultProviderProfileId?: string | null;
  availableProviderProfiles: AiProviderProfile[];
}

export interface ProviderProfilePayload {
  name: string;
  provider: AiProviderType;
  baseUrl?: string | null;
  model: string;
  apiKey?: string | null;
  apiKeys?: string[] | null;
  config?: Record<string, unknown> | null;
  isEnabled?: boolean;
  isDefault?: boolean;
}

export const aiApi = {
  async listThreads(projectId: string) {
    const response = await api.get<ApiSingleResponse<AiThread[]>>(
      `/projects/${projectId}/ai-chat/threads`
    );
    return response.data.data;
  },

  async createThread(projectId: string, payload: { title?: string; providerProfileId?: string | null }) {
    const response = await api.post<ApiSingleResponse<AiThread>>(
      `/projects/${projectId}/ai-chat/threads`,
      payload
    );
    return response.data.data;
  },

  async listMessages(projectId: string, threadId: string) {
    const response = await api.get<ApiSingleResponse<AiMessage[]>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}/messages`
    );
    return response.data.data;
  },

  async sendMessage(projectId: string, threadId: string, payload: { content: string; intent?: AiMessageIntent }) {
    const response = await api.post<ApiSingleResponse<SendAiMessageResponse>>(
      `/projects/${projectId}/ai-chat/threads/${threadId}/messages`,
      payload
    );
    return response.data.data;
  },

  async getProjectSettings(projectId: string) {
    const response = await api.get<ApiSingleResponse<ProjectAiSettings>>(
      `/projects/${projectId}/ai-chat/settings`
    );
    return response.data.data;
  },

  async getProjectStatus(projectId: string) {
    const response = await api.get<ApiSingleResponse<ProjectAiStatus>>(
      `/projects/${projectId}/ai-chat/status`
    );
    return response.data.data;
  },

  async updateProjectSettings(projectId: string, payload: Partial<ProjectAiSettings>) {
    const response = await api.put<ApiSingleResponse<ProjectAiSettings>>(
      `/projects/${projectId}/ai-chat/settings`,
      payload
    );
    return response.data.data;
  },

  async listProviderProfiles() {
    const response = await api.get<ApiSingleResponse<AiProviderProfile[]>>("/ai-provider-profiles");
    return response.data.data;
  },

  async createProviderProfile(payload: ProviderProfilePayload) {
    const response = await api.post<ApiSingleResponse<AiProviderProfile>>("/ai-provider-profiles", payload);
    return response.data.data;
  },

  async updateProviderProfile(profileId: string, payload: Partial<ProviderProfilePayload> & { clearApiKey?: boolean }) {
    const response = await api.put<ApiSingleResponse<AiProviderProfile>>(
      `/ai-provider-profiles/${profileId}`,
      payload
    );
    return response.data.data;
  },

  async listProviderModels(profileId: string) {
    const response = await api.get<ApiSingleResponse<AiProviderModelsResponse>>(
      `/ai-provider-profiles/${profileId}/models`
    );
    return response.data.data;
  },

  async testProvider(payload: Partial<ProviderProfilePayload> & { profileId?: string }) {
    const response = await api.post<ApiSingleResponse<AiProviderTestResponse>>(
      "/ai-provider-profiles/test",
      payload
    );
    return response.data.data;
  },

  async listProviderCredentials(profileId: string) {
    const response = await api.get<ApiSingleResponse<AiProviderCredential[]>>(
      `/ai-provider-profiles/${profileId}/credentials`
    );
    return response.data.data;
  },

  async createProviderCredentials(profileId: string, payload: { keys: string | string[]; label?: string | null }) {
    const response = await api.post<ApiSingleResponse<{ added: number; skipped: number; credentials: AiProviderCredential[] }>>(
      `/ai-provider-profiles/${profileId}/credentials`,
      payload
    );
    return response.data.data;
  },

  async updateProviderCredential(profileId: string, credentialId: string, payload: Partial<Pick<AiProviderCredential, "label" | "isEnabled">>) {
    const response = await api.put<ApiSingleResponse<AiProviderCredential>>(
      `/ai-provider-profiles/${profileId}/credentials/${credentialId}`,
      payload
    );
    return response.data.data;
  },

  async deleteProviderCredential(profileId: string, credentialId: string) {
    const response = await api.delete<ApiSingleResponse<{ id: string }>>(
      `/ai-provider-profiles/${profileId}/credentials/${credentialId}`
    );
    return response.data.data;
  },

  async exportProviderCredentials(profileId: string) {
    const response = await api.post<ApiSingleResponse<{ providerProfileId: string; keys: Array<{ id: string; label: string; apiKey: string | null }> }>>(
      `/ai-provider-profiles/${profileId}/credentials/export`,
      { confirmation: "EXPORT_PLAINTEXT_AI_KEYS" }
    );
    return response.data.data;
  },
};

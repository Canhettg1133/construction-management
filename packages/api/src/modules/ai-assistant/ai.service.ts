import { Prisma, type AiProviderProfile, type AiProviderType } from "@prisma/client";
import { hasMinPermission, type PermissionLevel, type ToolPermissionMap, type UserProjectPermissions } from "@construction/shared";
import { prisma } from "../../config/database";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors";
import { encryptSecret, decryptSecret } from "./ai.crypto";
import { buildAiContext, parseEnabledSourceTools, type AiSourceToolId } from "./ai.context";
import { buildAiPrompt, type AiMessageIntent } from "./ai.prompt";
import {
  AiProviderCallError,
  callAiProvider,
  getEnvProviderProfile,
  type AiProviderRuntimeProfile,
} from "./ai.provider";

interface AiActor {
  userId: string;
  permissions: UserProjectPermissions;
}

interface CreateThreadInput {
  projectId: string;
  ownerId: string;
  title?: string;
  providerProfileId?: string;
}

interface SendMessageInput {
  projectId: string;
  threadId: string;
  userId: string;
  content: string;
  intent: AiMessageIntent;
  permissions: UserProjectPermissions;
}

interface UpdateProjectSettingsInput {
  projectId: string;
  enabledSourceTools?: AiSourceToolId[] | null;
  customSystemPrompt?: string | null;
  defaultProviderProfileId?: string | null;
}

interface CreateProviderProfileInput {
  name: string;
  provider: AiProviderType;
  baseUrl?: string | null;
  model: string;
  apiKey?: string | null;
  config?: Record<string, unknown> | null;
  isEnabled?: boolean;
  isDefault?: boolean;
}

interface UpdateProviderProfileInput {
  id: string;
  name?: string;
  provider?: AiProviderType;
  baseUrl?: string | null;
  model?: string;
  apiKey?: string | null;
  clearApiKey?: boolean;
  config?: Record<string, unknown> | null;
  isEnabled?: boolean;
  isDefault?: boolean;
}

function isAiAdmin(permissions: UserProjectPermissions) {
  return (
    permissions.systemRole === "ADMIN" ||
    hasMinPermission((permissions.toolPermissions.AI_ASSISTANT ?? "NONE") as PermissionLevel, "ADMIN")
  );
}

function assertDraftPermission(intent: AiMessageIntent, permissions: ToolPermissionMap) {
  if (intent === "CHAT") {
    return;
  }

  const level = (permissions.AI_ASSISTANT ?? "NONE") as PermissionLevel;
  if (!hasMinPermission(level, "STANDARD")) {
    throw new ForbiddenError("Cần quyền STANDARD trên Trợ lý AI để tạo bản nháp");
  }
}

function isEnvProfileId(profileId: string | null | undefined) {
  return Boolean(profileId?.startsWith("env:"));
}

function readConfigObject(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableInputJson(value: unknown | null | undefined) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return toInputJson(value);
}

function sanitizeProviderProfile(profile: AiProviderProfile) {
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    model: profile.model,
    config: readConfigObject(profile.config),
    isEnabled: profile.isEnabled,
    isDefault: profile.isDefault,
    hasApiKey: Boolean(profile.apiKeyEncrypted),
    readonly: false,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
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
  };
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
  };
}

async function ensureEnabledProviderProfile(profileId: string | null | undefined) {
  if (!profileId || isEnvProfileId(profileId)) {
    return null;
  }

  const profile = await prisma.aiProviderProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile || !profile.isEnabled) {
    throw new BadRequestError("Provider AI không tồn tại hoặc đã bị tắt");
  }

  return profile;
}

async function resolveProviderProfile(projectId: string, threadProviderProfileId?: string | null) {
  if (threadProviderProfileId) {
    const profile = await ensureEnabledProviderProfile(threadProviderProfileId);
    if (profile) {
      return toRuntimeProfile(profile);
    }
  }

  const setting = await prisma.projectAiSetting.findUnique({
    where: { projectId },
    select: { defaultProviderProfileId: true },
  });

  if (setting?.defaultProviderProfileId) {
    const profile = await ensureEnabledProviderProfile(setting.defaultProviderProfileId);
    if (profile) {
      return toRuntimeProfile(profile);
    }
  }

  const defaultProfile = await prisma.aiProviderProfile.findFirst({
    where: { isEnabled: true, isDefault: true },
    orderBy: { updatedAt: "desc" },
  });

  if (defaultProfile) {
    return toRuntimeProfile(defaultProfile);
  }

  return getEnvProviderProfile();
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
    },
  });

  if (!thread || thread.projectId !== projectId) {
    throw new NotFoundError("Không tìm thấy cuộc trò chuyện AI");
  }

  if (thread.ownerId !== actor.userId && !isAiAdmin(actor.permissions)) {
    throw new ForbiddenError("Bạn không có quyền truy cập cuộc trò chuyện AI này");
  }

  return thread;
}

async function normalizeDefaultProviderProfileId(profileId: string | null | undefined) {
  if (!profileId || isEnvProfileId(profileId)) {
    return null;
  }

  await ensureEnabledProviderProfile(profileId);
  return profileId;
}

export const aiAssistantService = {
  isAiAdmin,

  async listThreads(projectId: string, actor: AiActor) {
    const threads = await prisma.aiChatThread.findMany({
      where: {
        projectId,
        ...(isAiAdmin(actor.permissions) ? {} : { ownerId: actor.userId }),
      },
      orderBy: { updatedAt: "desc" },
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
        providerProfile: { select: { id: true, name: true, provider: true, model: true } },
        _count: { select: { messages: true } },
      },
    });

    return threads;
  },

  async createThread(input: CreateThreadInput) {
    const providerProfile = await ensureEnabledProviderProfile(input.providerProfileId);
    const thread = await prisma.aiChatThread.create({
      data: {
        projectId: input.projectId,
        ownerId: input.ownerId,
        title: input.title?.trim() || "Cuộc trò chuyện mới",
        visibility: "PRIVATE",
        providerProfileId: providerProfile?.id ?? null,
      },
    });

    return thread;
  },

  async listMessages(projectId: string, threadId: string, actor: AiActor) {
    await ensureThreadAccess(projectId, threadId, actor);

    return prisma.aiChatMessage.findMany({
      where: { projectId, threadId },
      orderBy: { createdAt: "asc" },
    });
  },

  async sendMessage(input: SendMessageInput) {
    assertDraftPermission(input.intent, input.permissions.toolPermissions);

    const thread = await ensureThreadAccess(input.projectId, input.threadId, {
      userId: input.userId,
      permissions: input.permissions,
    });

    const setting = await prisma.projectAiSetting.findUnique({
      where: { projectId: input.projectId },
      select: {
        enabledSourceTools: true,
        customSystemPrompt: true,
      },
    });

    const context = await buildAiContext({
      projectId: input.projectId,
      permissions: input.permissions.toolPermissions,
      enabledSourceTools: parseEnabledSourceTools(setting?.enabledSourceTools ?? null),
    });

    const prompt = buildAiPrompt({
      question: input.content,
      intent: input.intent,
      context,
      customSystemPrompt: setting?.customSystemPrompt ?? null,
    });

    const userMessage = await prisma.aiChatMessage.create({
      data: {
        projectId: input.projectId,
        threadId: input.threadId,
        userId: input.userId,
        role: "USER",
        content: input.content,
        contextSources: toInputJson(context.sources),
      },
    });

    const providerProfile = await resolveProviderProfile(input.projectId, thread.providerProfileId);
    const startedAt = Date.now();

    try {
      const providerResponse = await callAiProvider(providerProfile, prompt);
      const latencyMs = Date.now() - startedAt;
      const assistantMessage = await prisma.aiChatMessage.create({
        data: {
          projectId: input.projectId,
          threadId: input.threadId,
          userId: null,
          role: "ASSISTANT",
          content: providerResponse.text,
          provider: providerResponse.provider,
          model: providerResponse.model,
          latencyMs,
          contextSources: toInputJson(context.sources),
        },
      });

      await prisma.aiChatThread.update({
        where: { id: input.threadId },
        data: {
          title: thread.title === "Cuộc trò chuyện mới" ? input.content.slice(0, 120) : thread.title,
          updatedAt: new Date(),
        },
      });

      return {
        userMessage,
        assistantMessage,
        contextSources: context.sources,
        includedTools: context.includedTools,
        omittedTools: context.omittedTools,
      };
    } catch (error) {
      const code = error instanceof AiProviderCallError ? error.code : "AI_PROVIDER_ERROR";
      const assistantMessage = await prisma.aiChatMessage.create({
        data: {
          projectId: input.projectId,
          threadId: input.threadId,
          userId: null,
          role: "ASSISTANT",
          content:
            "Không thể gọi nhà cung cấp AI ở thời điểm này. Câu hỏi của bạn đã được lưu, vui lòng kiểm tra cấu hình provider hoặc thử lại sau.",
          provider: providerProfile.provider,
          model: providerProfile.model,
          latencyMs: Date.now() - startedAt,
          contextSources: toInputJson(context.sources),
          errorCode: code,
        },
      });

      await prisma.aiChatThread.update({
        where: { id: input.threadId },
        data: { updatedAt: new Date() },
      });

      return {
        userMessage,
        assistantMessage,
        contextSources: context.sources,
        includedTools: context.includedTools,
        omittedTools: context.omittedTools,
      };
    }
  },

  async getProjectSettings(projectId: string) {
    const [setting, profiles] = await Promise.all([
      prisma.projectAiSetting.findUnique({
        where: { projectId },
      }),
      this.listAvailableProviderProfiles(),
    ]);

    return {
      projectId,
      enabledSourceTools: parseEnabledSourceTools(setting?.enabledSourceTools ?? null),
      customSystemPrompt: setting?.customSystemPrompt ?? "",
      defaultProviderProfileId: setting?.defaultProviderProfileId ?? null,
      availableProviderProfiles: profiles,
    };
  },

  async updateProjectSettings(input: UpdateProjectSettingsInput) {
    const defaultProviderProfileId = await normalizeDefaultProviderProfileId(input.defaultProviderProfileId);

    const createData: Prisma.ProjectAiSettingUncheckedCreateInput = {
      projectId: input.projectId,
      enabledSourceTools: toNullableInputJson(input.enabledSourceTools ?? null),
      customSystemPrompt: input.customSystemPrompt ?? null,
      defaultProviderProfileId,
    };

    const updateData: Prisma.ProjectAiSettingUncheckedUpdateInput = {
      ...(input.enabledSourceTools !== undefined && {
        enabledSourceTools: toNullableInputJson(input.enabledSourceTools),
      }),
      ...(input.customSystemPrompt !== undefined && { customSystemPrompt: input.customSystemPrompt }),
      ...(input.defaultProviderProfileId !== undefined && { defaultProviderProfileId }),
    };

    const setting = await prisma.projectAiSetting.upsert({
      where: { projectId: input.projectId },
      create: createData,
      update: updateData,
    });

    return {
      projectId: setting.projectId,
      enabledSourceTools: parseEnabledSourceTools(setting.enabledSourceTools),
      customSystemPrompt: setting.customSystemPrompt ?? "",
      defaultProviderProfileId: setting.defaultProviderProfileId,
      availableProviderProfiles: await this.listAvailableProviderProfiles(),
    };
  },

  async listAvailableProviderProfiles() {
    const profiles = await prisma.aiProviderProfile.findMany({
      where: { isEnabled: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return [...profiles.map(sanitizeProviderProfile), sanitizeEnvProviderProfile(getEnvProviderProfile())];
  },

  async listProviderProfiles() {
    const profiles = await prisma.aiProviderProfile.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return [...profiles.map(sanitizeProviderProfile), sanitizeEnvProviderProfile(getEnvProviderProfile())];
  },

  async createProviderProfile(input: CreateProviderProfileInput) {
    if (input.isDefault) {
      await prisma.aiProviderProfile.updateMany({ data: { isDefault: false } });
    }

    const profile = await prisma.aiProviderProfile.create({
      data: {
        name: input.name,
        provider: input.provider,
        baseUrl: input.baseUrl ?? null,
        model: input.model,
        apiKeyEncrypted: encryptSecret(input.apiKey),
        config: toNullableInputJson(input.config),
        isEnabled: input.isEnabled ?? true,
        isDefault: input.isDefault ?? false,
      },
    });

    return sanitizeProviderProfile(profile);
  },

  async updateProviderProfile(input: UpdateProviderProfileInput) {
    const existing = await prisma.aiProviderProfile.findUnique({ where: { id: input.id } });
    if (!existing) {
      throw new NotFoundError("Không tìm thấy provider AI");
    }

    if (input.isDefault) {
      await prisma.aiProviderProfile.updateMany({
        where: { id: { not: input.id } },
        data: { isDefault: false },
      });
    }

    const apiKeyEncrypted =
      input.clearApiKey === true ? null : input.apiKey !== undefined ? encryptSecret(input.apiKey) : undefined;

    const profile = await prisma.aiProviderProfile.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.provider !== undefined && { provider: input.provider }),
        ...(input.baseUrl !== undefined && { baseUrl: input.baseUrl }),
        ...(input.model !== undefined && { model: input.model }),
        ...(apiKeyEncrypted !== undefined && { apiKeyEncrypted }),
        ...(input.config !== undefined && { config: toNullableInputJson(input.config) }),
        ...(input.isEnabled !== undefined && { isEnabled: input.isEnabled }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });

    return sanitizeProviderProfile(profile);
  },
};

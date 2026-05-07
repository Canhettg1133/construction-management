import { AuditEntityType, Prisma, type AiProviderCredential, type AiProviderProfile, type AiProviderType } from "@prisma/client";
import { hasMinPermission, type PermissionLevel, type ToolPermissionMap, type UserProjectPermissions } from "@construction/shared";
import { prisma } from "../../config/database";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors";
import { auditService } from "../audit/audit.service";
import { encryptSecret, decryptSecret, hashSecret, maskSecret } from "./ai.crypto";
import { buildAiContext, parseEnabledSourceTools, type AiSourceToolId } from "./ai.context";
import { buildAiPrompt, type AiMessageIntent } from "./ai.prompt";
import {
  AiProviderCallError,
  callAiProvider,
  getEnvProviderProfile,
  listAiProviderModels,
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
  actorUserId?: string;
}

interface CreateProviderProfileInput {
  name: string;
  provider: AiProviderType;
  baseUrl?: string | null;
  model: string;
  apiKey?: string | null;
  apiKeys?: string[] | null;
  config?: Record<string, unknown> | null;
  isEnabled?: boolean;
  isDefault?: boolean;
  actorUserId?: string;
}

interface UpdateProviderProfileInput {
  id: string;
  name?: string;
  provider?: AiProviderType;
  baseUrl?: string | null;
  model?: string;
  apiKey?: string | null;
  apiKeys?: string[] | null;
  clearApiKey?: boolean;
  config?: Record<string, unknown> | null;
  isEnabled?: boolean;
  isDefault?: boolean;
  actorUserId?: string;
}

interface CreateProviderCredentialsInput {
  providerProfileId: string;
  keys: string[] | string;
  label?: string | null;
  actorUserId?: string;
}

interface UpdateProviderCredentialInput {
  providerProfileId: string;
  credentialId: string;
  label?: string;
  isEnabled?: boolean;
  actorUserId?: string;
}

interface ExportProviderCredentialsInput {
  providerProfileId: string;
  confirmation: string;
  actorUserId?: string;
}

interface ProviderTestInput {
  profileId?: string;
  provider?: AiProviderType;
  name?: string;
  baseUrl?: string | null;
  model?: string;
  apiKey?: string | null;
  config?: Record<string, unknown> | null;
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

type CredentialPublicFields = Pick<
  AiProviderCredential,
  "id" | "label" | "isEnabled" | "lastUsedAt" | "failureCount" | "disabledUntil" | "createdAt" | "updatedAt"
>;

type ProviderProfileWithCredentials = AiProviderProfile & {
  credentials?: CredentialPublicFields[];
};

function normalizeSecretCandidates(value: string[] | string | null | undefined) {
  const rawItems = Array.isArray(value) ? value : String(value ?? "").split(/[\s,;]+/u);
  return rawItems.map((item) => item.trim()).filter((item) => item.length >= 10);
}

function mergeSecretCandidates(input: { apiKey?: string | null; apiKeys?: string[] | null }) {
  return [
    ...normalizeSecretCandidates(input.apiKey ?? null),
    ...normalizeSecretCandidates(input.apiKeys ?? null),
  ];
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
  };
}

function sanitizeProviderProfile(profile: ProviderProfileWithCredentials) {
  const credentials = profile.credentials ?? [];
  const enabledCredentials = credentials.filter(
    (credential) => credential.isEnabled && (!credential.disabledUntil || credential.disabledUntil <= new Date())
  );

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

async function selectAvailableCredential(providerProfileId: string) {
  const now = new Date();
  return prisma.aiProviderCredential.findFirst({
    where: {
      providerProfileId,
      isEnabled: true,
      OR: [{ disabledUntil: null }, { disabledUntil: { lte: now } }],
    },
    orderBy: [{ lastUsedAt: "asc" }, { createdAt: "asc" }],
  });
}

async function toRuntimeProfileWithCredential(profile: AiProviderProfile): Promise<AiProviderRuntimeProfile> {
  const credential = await selectAvailableCredential(profile.id);
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
    };
  }

  return toRuntimeProfile(profile);
}

function shouldTemporarilyDisableCredential(code: string) {
  return ["AI_PROVIDER_HTTP_429", "AI_PROVIDER_HTTP_503", "AI_PROVIDER_HTTP_504"].includes(code);
}

async function recordCredentialSuccess(profile: AiProviderRuntimeProfile) {
  if (!profile.credentialId) {
    return;
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
    .catch(() => undefined);
}

async function recordCredentialFailure(profile: AiProviderRuntimeProfile, code: string) {
  if (!profile.credentialId) {
    return;
  }

  await prisma.aiProviderCredential
    .update({
      where: { id: profile.credentialId },
      data: {
        failureCount: { increment: 1 },
        disabledUntil: shouldTemporarilyDisableCredential(code)
          ? new Date(Date.now() + 10 * 60 * 1000)
          : undefined,
      },
    })
    .catch(() => undefined);
}

async function addCredentialsToProfile(input: CreateProviderCredentialsInput) {
  const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.providerProfileId } });
  if (!profile) {
    throw new NotFoundError("Không tìm thấy provider AI");
  }

  const candidates = [...new Set(normalizeSecretCandidates(input.keys))];
  if (candidates.length === 0) {
    throw new BadRequestError("Không tìm thấy API key hợp lệ");
  }

  const hashes = candidates.map((key) => hashSecret(key));
  const existing = await prisma.aiProviderCredential.findMany({
    where: { providerProfileId: profile.id, keyHash: { in: hashes } },
    select: { keyHash: true },
  });
  const existingHashes = new Set(existing.map((item) => item.keyHash));
  const credentials: Array<CredentialPublicFields & { apiKeyPlaintext: string }> = [];
  let skipped = 0;

  for (const [index, key] of candidates.entries()) {
    const keyHash = hashes[index];
    if (existingHashes.has(keyHash)) {
      skipped += 1;
      continue;
    }

    const credential = await prisma.aiProviderCredential.create({
      data: {
        providerProfileId: profile.id,
        label: candidates.length === 1 && input.label?.trim() ? input.label.trim() : `Key ${credentials.length + existing.length + 1}`,
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
    });
    credentials.push({ ...credential, apiKeyPlaintext: key });
  }

  if (credentials.length > 0) {
    await auditService.log({
      userId: input.actorUserId,
      action: "CREATE",
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: profile.id,
      description: `Thêm ${credentials.length} API key cho provider AI ${profile.name}`,
    });
  }

  return {
    added: credentials.length,
    skipped,
    credentials: credentials.map((credential) => sanitizeCredential(credential)),
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
      return toRuntimeProfileWithCredential(profile);
    }
  }

  const setting = await prisma.projectAiSetting.findUnique({
    where: { projectId },
    select: { defaultProviderProfileId: true },
  });

  if (setting?.defaultProviderProfileId) {
    const profile = await ensureEnabledProviderProfile(setting.defaultProviderProfileId);
    if (profile) {
      return toRuntimeProfileWithCredential(profile);
    }
  }

  const defaultProfile = await prisma.aiProviderProfile.findFirst({
    where: { isEnabled: true, isDefault: true },
    orderBy: { updatedAt: "desc" },
  });

  if (defaultProfile) {
    return toRuntimeProfileWithCredential(defaultProfile);
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
      await recordCredentialSuccess(providerProfile);
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
      await recordCredentialFailure(providerProfile, code);
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

    await auditService.log({
      userId: input.actorUserId,
      action: "UPDATE",
      entityType: AuditEntityType.PROJECT_AI_SETTING,
      entityId: setting.projectId,
      description: `Cập nhật cài đặt AI cho dự án ${setting.projectId}`,
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
    });

    return [...profiles.map(sanitizeProviderProfile), sanitizeEnvProviderProfile(getEnvProviderProfile())];
  },

  async listProviderProfiles() {
    const profiles = await prisma.aiProviderProfile.findMany({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
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
        apiKeyEncrypted: null,
        config: toNullableInputJson(input.config),
        isEnabled: input.isEnabled ?? true,
        isDefault: input.isDefault ?? false,
      },
    });

    const keys = mergeSecretCandidates(input);
    if (keys.length > 0) {
      await addCredentialsToProfile({
        providerProfileId: profile.id,
        keys,
        actorUserId: input.actorUserId,
      });
    }

    await auditService.log({
      userId: input.actorUserId,
      action: "CREATE",
      entityType: AuditEntityType.AI_PROVIDER_PROFILE,
      entityId: profile.id,
      description: `Tạo provider AI ${profile.name}`,
    });

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
    });

    return sanitizeProviderProfile(created ?? profile);
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

    if (input.clearApiKey === true) {
      await prisma.aiProviderCredential.deleteMany({ where: { providerProfileId: input.id } });
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
    });

    const keys = mergeSecretCandidates(input);
    if (keys.length > 0) {
      await addCredentialsToProfile({
        providerProfileId: profile.id,
        keys,
        actorUserId: input.actorUserId,
      });
      await prisma.aiProviderProfile.update({
        where: { id: profile.id },
        data: { apiKeyEncrypted: null },
      });
    }

    await auditService.log({
      userId: input.actorUserId,
      action: "UPDATE",
      entityType: AuditEntityType.AI_PROVIDER_PROFILE,
      entityId: profile.id,
      description: `Cập nhật provider AI ${profile.name}`,
    });

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
    });

    return sanitizeProviderProfile(updated ?? profile);
  },

  async getProjectAiStatus(projectId: string) {
    const setting = await prisma.projectAiSetting.findUnique({
      where: { projectId },
      select: { defaultProviderProfileId: true },
    });

    const profileId = setting?.defaultProviderProfileId;
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
          orderBy: { updatedAt: "desc" },
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
        });

    const effectiveProfile = profile ? sanitizeProviderProfile(profile) : sanitizeEnvProviderProfile(getEnvProviderProfile());
    return {
      projectId,
      providerProfile: effectiveProfile,
      displayText: `Đang dùng: ${effectiveProfile.name} · ${effectiveProfile.model} · cấu hình bởi quản trị viên`,
    };
  },

  async listProviderCredentials(providerProfileId: string) {
    const profile = await prisma.aiProviderProfile.findUnique({ where: { id: providerProfileId } });
    if (!profile) {
      throw new NotFoundError("Không tìm thấy provider AI");
    }

    const credentials = await prisma.aiProviderCredential.findMany({
      where: { providerProfileId },
      orderBy: { createdAt: "asc" },
    });

    const listed = credentials.map((credential) =>
      sanitizeCredential({
        ...credential,
        apiKeyPlaintext: decryptSecret(credential.apiKeyEncrypted),
      })
    );

    if (profile.apiKeyEncrypted) {
      listed.unshift({
        id: "legacy",
        label: "Key legacy",
        maskedKey: maskSecret(decryptSecret(profile.apiKeyEncrypted)),
        isEnabled: true,
        lastUsedAt: null,
        failureCount: 0,
        disabledUntil: null,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      });
    }

    return listed;
  },

  async createProviderCredentials(input: CreateProviderCredentialsInput) {
    return addCredentialsToProfile(input);
  },

  async updateProviderCredential(input: UpdateProviderCredentialInput) {
    const credential = await prisma.aiProviderCredential.findFirst({
      where: { id: input.credentialId, providerProfileId: input.providerProfileId },
    });
    if (!credential) {
      throw new NotFoundError("Không tìm thấy API key AI");
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
    });

    await auditService.log({
      userId: input.actorUserId,
      action: "UPDATE",
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: updated.id,
      description: `Cập nhật API key AI ${updated.label}`,
    });

    return sanitizeCredential(updated);
  },

  async deleteProviderCredential(providerProfileId: string, credentialId: string, actorUserId?: string) {
    const credential = await prisma.aiProviderCredential.findFirst({
      where: { id: credentialId, providerProfileId },
    });
    if (!credential) {
      throw new NotFoundError("Không tìm thấy API key AI");
    }

    await prisma.aiProviderCredential.delete({ where: { id: credential.id } });
    await auditService.log({
      userId: actorUserId,
      action: "DELETE",
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: credential.id,
      description: `Xóa API key AI ${credential.label}`,
    });

    return { id: credential.id };
  },

  async exportProviderCredentials(input: ExportProviderCredentialsInput) {
    if (input.confirmation !== "EXPORT_PLAINTEXT_AI_KEYS") {
      throw new BadRequestError("Cần xác nhận trước khi xuất API key gốc");
    }

    const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.providerProfileId } });
    if (!profile) {
      throw new NotFoundError("Không tìm thấy provider AI");
    }

    const credentials = await prisma.aiProviderCredential.findMany({
      where: { providerProfileId: profile.id },
      orderBy: { createdAt: "asc" },
    });

    const exported = credentials.map((credential) => ({
      id: credential.id,
      label: credential.label,
      apiKey: decryptSecret(credential.apiKeyEncrypted),
    }));

    if (profile.apiKeyEncrypted) {
      exported.unshift({
        id: "legacy",
        label: "Key legacy",
        apiKey: decryptSecret(profile.apiKeyEncrypted),
      });
    }

    await auditService.log({
      userId: input.actorUserId,
      action: "UPDATE",
      entityType: AuditEntityType.AI_PROVIDER_CREDENTIAL,
      entityId: profile.id,
      description: `Xuất plaintext API key của provider AI ${profile.name}`,
    });

    return { providerProfileId: profile.id, keys: exported };
  },

  async listProviderModels(profileId: string) {
    const profile = await prisma.aiProviderProfile.findUnique({ where: { id: profileId } });
    if (!profile) {
      throw new NotFoundError("Không tìm thấy provider AI");
    }

    const runtimeProfile = await toRuntimeProfileWithCredential(profile);
    const models = await listAiProviderModels(runtimeProfile);
    const currentConfig = readConfigObject(profile.config) ?? {};
    await prisma.aiProviderProfile.update({
      where: { id: profile.id },
      data: {
        config: toInputJson({
          ...currentConfig,
          modelOptions: models,
          lastModelSyncAt: new Date().toISOString(),
        }),
      },
    });

    return { providerProfileId: profile.id, models };
  },

  async testProvider(input: ProviderTestInput) {
    const runtimeProfile = input.profileId
      ? await (async () => {
          const profile = await prisma.aiProviderProfile.findUnique({ where: { id: input.profileId } });
          if (!profile) {
            throw new NotFoundError("Không tìm thấy provider AI");
          }
          return toRuntimeProfileWithCredential(profile);
        })()
      : ({
          id: "test",
          name: input.name ?? "Provider kiểm tra",
          provider: input.provider ?? "MOCK",
          baseUrl: input.baseUrl ?? null,
          model: input.model ?? "mock-construction-assistant",
          apiKey: input.apiKey ?? null,
          config: input.config ?? null,
        } satisfies AiProviderRuntimeProfile);

    try {
      const startedAt = Date.now();
      const response = await callAiProvider(runtimeProfile, {
        system: "Bạn là bộ kiểm tra kết nối. Trả lời ngắn gọn bằng tiếng Việt.",
        user: "Hãy trả lời: Kết nối AI hoạt động.",
      });
      await recordCredentialSuccess(runtimeProfile);
      return {
        success: true,
        provider: response.provider,
        model: response.model,
        latencyMs: Date.now() - startedAt,
        message: "Kết nối provider AI hoạt động.",
      };
    } catch (error) {
      const code = error instanceof AiProviderCallError ? error.code : "AI_PROVIDER_ERROR";
      await recordCredentialFailure(runtimeProfile, code);
      return {
        success: false,
        provider: runtimeProfile.provider,
        model: runtimeProfile.model,
        errorCode: code,
        message: "Không kiểm tra được provider AI. Vui lòng kiểm tra key, model, base URL hoặc trạng thái dịch vụ.",
      };
    }
  },
};

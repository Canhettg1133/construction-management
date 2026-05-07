import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProjectPermissions } from "@construction/shared";

process.env.AI_SECRET_ENCRYPTION_KEY = "test-ai-secret-encryption-key-32-chars";

const prismaMock = {
  aiChatThread: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  aiChatMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  projectAiSetting: {
    findUnique: vi.fn(),
  },
  aiProviderProfile: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  aiProviderCredential: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("../../config/database", () => ({
  prisma: prismaMock,
}));

vi.mock("./ai.context", () => ({
  AI_SOURCE_TOOL_IDS: [
    "PROJECT",
    "TASK",
    "DAILY_REPORT",
    "FILE",
    "DOCUMENT",
    "SAFETY",
    "QUALITY",
    "WAREHOUSE",
    "BUDGET",
  ],
  parseEnabledSourceTools: vi.fn(() => null),
  buildAiContext: vi.fn().mockResolvedValue({
    projectId: "project-1",
    generatedAt: "2026-05-07T00:00:00.000Z",
    includedTools: ["PROJECT"],
    omittedTools: [],
    sources: [],
    data: { project: { id: "project-1", name: "Dự án kiểm thử" } },
  }),
}));

vi.mock("./ai.prompt", () => ({
  buildAiPrompt: vi.fn(() => ({ system: "system", user: "user" })),
}));

class MockAiProviderCallError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

const providerMock = {
  callAiProvider: vi.fn(),
  listAiProviderModels: vi.fn(),
  getEnvProviderProfile: vi.fn(() => ({
    id: "env:MOCK",
    name: "Mock provider",
    provider: "MOCK",
    baseUrl: null,
    model: "mock-construction-assistant",
    apiKey: null,
    readonly: true,
  })),
  AiProviderCallError: MockAiProviderCallError,
};

vi.mock("./ai.provider", () => providerMock);
vi.mock("../audit/audit.service", () => ({
  auditService: { log: vi.fn() },
}));

const { aiAssistantService } = await import("./ai.service");
const { encryptSecret } = await import("./ai.crypto");

const basePermissions: UserProjectPermissions = {
  projectId: "project-1",
  userId: "owner-user",
  systemRole: "STAFF",
  projectRole: "ENGINEER",
  toolPermissions: {
    PROJECT: "READ",
    TASK: "READ",
    DAILY_REPORT: "READ",
    FILE: "READ",
    DOCUMENT: "READ",
    SAFETY: "READ",
    QUALITY: "READ",
    WAREHOUSE: "READ",
    BUDGET: "READ",
    AI_ASSISTANT: "STANDARD",
  },
  specialPrivileges: [],
  effectiveRole: {
    isAdmin: false,
    canManageMembers: false,
    canApproveSafety: false,
    canApproveQuality: false,
    canApproveBudget: false,
  },
};

describe("aiAssistantService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.aiChatMessage.create.mockImplementation(async ({ data }) => ({
      id: data.role === "USER" ? "message-user" : "message-assistant",
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      ...data,
    }));
    prismaMock.aiChatThread.update.mockResolvedValue({});
    prismaMock.projectAiSetting.findUnique.mockResolvedValue(null);
    prismaMock.aiProviderProfile.findFirst.mockResolvedValue(null);
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue(null);
    prismaMock.aiProviderProfile.update.mockResolvedValue({});
    prismaMock.aiProviderCredential.findFirst.mockResolvedValue(null);
    prismaMock.aiProviderCredential.findMany.mockResolvedValue([]);
    prismaMock.aiProviderCredential.create.mockImplementation(async ({ data, select }) => ({
      id: "credential-created",
      label: data.label,
      isEnabled: true,
      lastUsedAt: null,
      failureCount: 0,
      disabledUntil: null,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z"),
      ...(select?.apiKeyEncrypted ? { apiKeyEncrypted: data.apiKeyEncrypted } : {}),
    }));
    prismaMock.aiProviderCredential.update.mockResolvedValue({});
    prismaMock.aiProviderCredential.delete.mockResolvedValue({});
    providerMock.listAiProviderModels.mockResolvedValue([]);
  });

  it("không cho user đọc thread private của người khác", async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: "thread-1",
      projectId: "project-1",
      ownerId: "other-user",
      title: "Thread riêng",
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      aiAssistantService.listMessages("project-1", "thread-1", {
        userId: "owner-user",
        permissions: basePermissions,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lưu assistant message lỗi khi provider thất bại mà không làm mất user message", async () => {
    prismaMock.aiChatThread.findUnique.mockResolvedValue({
      id: "thread-1",
      projectId: "project-1",
      ownerId: "owner-user",
      title: "Cuộc trò chuyện mới",
      providerProfileId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    providerMock.callAiProvider.mockRejectedValue(new MockAiProviderCallError("AI_PROVIDER_NOT_CONFIGURED"));

    const result = await aiAssistantService.sendMessage({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "owner-user",
      content: "Tóm tắt dự án tuần này",
      intent: "CHAT",
      permissions: basePermissions,
    });

    expect(result.userMessage.role).toBe("USER");
    expect(result.assistantMessage.role).toBe("ASSISTANT");
    expect(result.assistantMessage.errorCode).toBe("AI_PROVIDER_NOT_CONFIGURED");
    expect(result.assistantMessage.content).not.toContain("secret");
    expect(prismaMock.aiChatMessage.create).toHaveBeenCalledTimes(2);
  });

  it("tạo credential pool, bỏ qua key trùng và không lưu plaintext", async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      name: "Gemini",
      provider: "GEMINI_DIRECT",
      baseUrl: null,
      model: "gemini-2.5-flash",
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: true,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    });
    prismaMock.aiProviderCredential.findMany.mockImplementationOnce(async ({ where }) => [
      { keyHash: where.keyHash.in[0] },
    ]);

    const result = await aiAssistantService.createProviderCredentials({
      providerProfileId: "profile-1",
      keys: ["sk-existing-key-123", "sk-new-key-456"],
      actorUserId: "admin-user",
    });

    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.credentials[0].maskedKey).toBe("sk-new...-456");

    const createCall = prismaMock.aiProviderCredential.create.mock.calls[0][0];
    expect(createCall.data.apiKeyEncrypted).not.toContain("sk-new-key-456");
    expect(createCall.data.keyHash).not.toBe("sk-new-key-456");
  });

  it("chỉ trả key đã mask khi list credential", async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      name: "OpenAI",
      provider: "OPENAI_COMPATIBLE",
      baseUrl: "https://models.github.ai/inference/v1",
      model: "openai/gpt-4.1-mini",
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: false,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    });
    prismaMock.aiProviderCredential.findMany.mockResolvedValue([
      {
        id: "credential-1",
        label: "Key chính",
        apiKeyEncrypted: encryptSecret("sk-secret-value-123456"),
        isEnabled: true,
        lastUsedAt: null,
        failureCount: 0,
        disabledUntil: null,
        createdAt: new Date("2026-05-07T00:00:00.000Z"),
        updatedAt: new Date("2026-05-07T00:00:00.000Z"),
      },
    ]);

    const result = await aiAssistantService.listProviderCredentials("profile-1");

    expect(result).toEqual([
      expect.objectContaining({
        id: "credential-1",
        label: "Key chính",
        maskedKey: "sk-sec...3456",
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain("sk-secret-value-123456");
    expect(JSON.stringify(result)).not.toContain("apiKeyEncrypted");
  });

  it("export credential trả plaintext ở service để route system admin kiểm soát quyền", async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      name: "Gemini",
      provider: "GEMINI_DIRECT",
      baseUrl: null,
      model: "gemini-2.5-flash",
      apiKeyEncrypted: null,
      config: null,
      isEnabled: true,
      isDefault: true,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    });
    prismaMock.aiProviderCredential.findMany.mockResolvedValue([
      {
        id: "credential-1",
        label: "Gemini 1",
        apiKeyEncrypted: encryptSecret("AIza-test-key-123456"),
        createdAt: new Date("2026-05-07T00:00:00.000Z"),
      },
    ]);

    const result = await aiAssistantService.exportProviderCredentials({
      providerProfileId: "profile-1",
      confirmation: "EXPORT_PLAINTEXT_AI_KEYS",
      actorUserId: "admin-user",
    });

    expect(result.keys).toEqual([
      { id: "credential-1", label: "Gemini 1", apiKey: "AIza-test-key-123456" },
    ]);
  });

  it("dùng credential đang bật và chưa bị tạm khóa khi lấy danh sách model", async () => {
    prismaMock.aiProviderProfile.findUnique.mockResolvedValue({
      id: "profile-1",
      name: "OpenAI compatible",
      provider: "OPENAI_COMPATIBLE",
      baseUrl: "https://models.github.ai/inference/v1",
      model: "openai/gpt-4.1-mini",
      apiKeyEncrypted: null,
      config: { modelsPath: "/models" },
      isEnabled: true,
      isDefault: false,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    });
    prismaMock.aiProviderCredential.findFirst.mockResolvedValue({
      id: "credential-live",
      providerProfileId: "profile-1",
      label: "Key còn hiệu lực",
      apiKeyEncrypted: encryptSecret("sk-live-key-123456"),
      isEnabled: true,
      lastUsedAt: null,
      failureCount: 0,
      disabledUntil: null,
      createdAt: new Date("2026-05-07T00:00:00.000Z"),
      updatedAt: new Date("2026-05-07T00:00:00.000Z"),
    });
    providerMock.listAiProviderModels.mockResolvedValue([
      { id: "openai/gpt-4.1-mini", label: "GPT 4.1 Mini", source: "OPENAI_COMPATIBLE" },
    ]);

    const result = await aiAssistantService.listProviderModels("profile-1");

    expect(prismaMock.aiProviderCredential.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isEnabled: true,
          OR: expect.arrayContaining([{ disabledUntil: null }]),
        }),
      })
    );
    expect(providerMock.listAiProviderModels).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialId: "credential-live",
        apiKey: "sk-live-key-123456",
      })
    );
    expect(result.models).toHaveLength(1);
  });

  it("lấy danh sách model từ cấu hình provider nháp mà không cần lưu provider trước", async () => {
    providerMock.listAiProviderModels.mockResolvedValue([
      { id: "openai/gpt-4.1-mini", label: "GPT 4.1 Mini", source: "OPENAI_COMPATIBLE" },
    ]);

    const result = await aiAssistantService.listProviderModelsFromConfig({
      provider: "OPENAI_COMPATIBLE",
      baseUrl: "https://ag.beijixingxing.com/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-draft-key-123456",
      config: { modelsPath: "/models" },
    });

    expect(result.providerProfileId).toBe("test");
    expect(result.models).toHaveLength(1);
    expect(providerMock.listAiProviderModels).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test",
        apiKey: "sk-draft-key-123456",
        config: { modelsPath: "/models" },
      })
    );
    expect(prismaMock.aiProviderProfile.findUnique).not.toHaveBeenCalled();
  });

  it("provider test trả lỗi có kiểm soát và không lộ API key", async () => {
    providerMock.callAiProvider.mockRejectedValue(new MockAiProviderCallError("AI_PROVIDER_HTTP_429"));

    const result = await aiAssistantService.testProvider({
      provider: "OPENAI_COMPATIBLE",
      baseUrl: "https://models.github.ai/inference/v1",
      model: "openai/gpt-4.1-mini",
      apiKey: "sk-sensitive-key-123456",
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("AI_PROVIDER_HTTP_429");
    expect(JSON.stringify(result)).not.toContain("sk-sensitive-key-123456");
  });
});

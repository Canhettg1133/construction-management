import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProjectPermissions } from "@construction/shared";

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

const { aiAssistantService } = await import("./ai.service");

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
});

import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { TOOL_IDS, type PermissionLevel, type ToolPermissionMap } from "@construction/shared";
import { buildAuthCookie } from "../../test/request-test-helpers";

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "mysql://test:test@localhost:3306/test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-test-jwt-secret-123";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-test-refresh-secret-123";
process.env.NODE_ENV = "test";

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function buildPermissionMap(level: PermissionLevel): ToolPermissionMap {
  return Object.fromEntries(TOOL_IDS.map((toolId) => [toolId, level])) as ToolPermissionMap;
}

const permissionServiceMock = {
  getProjectMembership: vi.fn(async (userId: string, projectId: string) => ({
    projectId,
    userId,
    systemRole: userId === "admin-user" ? "ADMIN" : "STAFF",
    projectRole: userId === "admin-user" ? null : "VIEWER",
    isMember: userId !== "staff-user",
    isSystemAdmin: userId === "admin-user",
  })),
  getUserProjectPermissions: vi.fn(async (userId: string, projectId: string) => {
    const isAdmin = userId === "admin-user";
    const toolPermissions = buildPermissionMap(isAdmin ? "ADMIN" : "READ");
    if (userId === "viewer-user") {
      toolPermissions.AI_ASSISTANT = "NONE";
    }

    return {
      projectId,
      userId,
      systemRole: isAdmin ? "ADMIN" : "STAFF",
      projectRole: isAdmin ? null : "VIEWER",
      toolPermissions,
      specialPrivileges: [],
      effectiveRole: {
        isAdmin,
        canManageMembers: isAdmin,
        canApproveSafety: false,
        canApproveQuality: false,
        canApproveBudget: false,
      },
    };
  }),
};

const aiAssistantServiceMock = {
  listThreads: vi.fn().mockResolvedValue([]),
  createThread: vi.fn().mockResolvedValue({ id: "thread-1", title: "Cuộc trò chuyện mới" }),
  listMessages: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn().mockResolvedValue({
    userMessage: { id: "message-user", role: "USER" },
    assistantMessage: { id: "message-assistant", role: "ASSISTANT", content: "Mock" },
    contextSources: [],
    includedTools: [],
    omittedTools: [],
  }),
  getProjectSettings: vi.fn().mockResolvedValue({
    projectId: PROJECT_ID,
    enabledSourceTools: null,
    customSystemPrompt: "",
    defaultProviderProfileId: null,
    availableProviderProfiles: [],
  }),
  getProjectAiStatus: vi.fn().mockResolvedValue({
    projectId: PROJECT_ID,
    providerProfile: {
      id: "profile-1",
      name: "Gemini Direct",
      provider: "GEMINI_DIRECT",
      model: "gemini-2.5-flash",
      readonly: false,
    },
    displayText: "Đang dùng: Gemini Direct · gemini-2.5-flash · cấu hình bởi quản trị viên",
  }),
  updateProjectSettings: vi.fn(),
  listProviderProfiles: vi.fn().mockResolvedValue([]),
  createProviderProfile: vi.fn(),
  updateProviderProfile: vi.fn(),
  listProviderModels: vi.fn().mockResolvedValue({ providerProfileId: "profile-1", models: [] }),
  testProvider: vi.fn().mockResolvedValue({
    success: true,
    provider: "MOCK",
    model: "mock-construction-assistant",
    message: "Kết nối provider AI hoạt động.",
  }),
  listProviderCredentials: vi.fn().mockResolvedValue([]),
  createProviderCredentials: vi.fn().mockResolvedValue({ added: 1, skipped: 0, credentials: [] }),
  updateProviderCredential: vi.fn().mockResolvedValue({ id: "credential-1", maskedKey: "sk-abc...xyz" }),
  deleteProviderCredential: vi.fn().mockResolvedValue({ id: "credential-1" }),
  exportProviderCredentials: vi.fn().mockResolvedValue({
    providerProfileId: "profile-1",
    keys: [{ id: "credential-1", label: "Key 1", apiKey: "sk-secret" }],
  }),
};

vi.mock("../../shared/services/permission.service", () => ({
  permissionService: permissionServiceMock,
}));

vi.mock("./ai.service", () => ({
  aiAssistantService: aiAssistantServiceMock,
}));

const { default: app } = await import("../../app");

describe("AI assistant routes", () => {
  it("yêu cầu đăng nhập trước khi xem thread", async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`);

    expect(res.status).toBe(401);
  });

  it("chặn member không có quyền AI_ASSISTANT", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set("Cookie", buildAuthCookie("VIEWER"));

    expect(res.status).toBe(403);
  });

  it("chặn user không thuộc dự án trước khi vào AI chat", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set("Cookie", buildAuthCookie("STAFF"));

    expect(res.status).toBe(403);
  });

  it("cho phép member có AI_ASSISTANT READ xem thread private của mình", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(aiAssistantServiceMock.listThreads).toHaveBeenCalled();
  });

  it("cho phép user có AI_ASSISTANT READ xem trạng thái provider đã được admin cấu hình", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/status`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(200);
    expect(res.body.data.displayText).toContain("Gemini Direct");
    expect(JSON.stringify(res.body)).not.toContain("sk-secret");
  });

  it("chỉ system admin được quản lý provider profile toàn cục", async () => {
    const denied = await request(app)
      .get("/api/v1/ai-provider-profiles")
      .set("Cookie", buildAuthCookie("ENGINEER"));
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get("/api/v1/ai-provider-profiles")
      .set("Cookie", buildAuthCookie("ADMIN"));
    expect(allowed.status).toBe(200);
  });

  it("chỉ system admin được export plaintext API key provider", async () => {
    const denied = await request(app)
      .post("/api/v1/ai-provider-profiles/profile-1/credentials/export")
      .set("Cookie", buildAuthCookie("ENGINEER"))
      .send({ confirmation: "EXPORT_PLAINTEXT_AI_KEYS" });
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .post("/api/v1/ai-provider-profiles/profile-1/credentials/export")
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ confirmation: "EXPORT_PLAINTEXT_AI_KEYS" });
    expect(allowed.status).toBe(200);
    expect(aiAssistantServiceMock.exportProviderCredentials).toHaveBeenCalledWith({
      providerProfileId: "profile-1",
      confirmation: "EXPORT_PLAINTEXT_AI_KEYS",
      actorUserId: "admin-user",
    });
  });

  it("chỉ system admin được lấy model và kiểm tra provider toàn cục", async () => {
    const denied = await request(app)
      .get("/api/v1/ai-provider-profiles/profile-1/models")
      .set("Cookie", buildAuthCookie("ENGINEER"));
    expect(denied.status).toBe(403);

    const models = await request(app)
      .get("/api/v1/ai-provider-profiles/profile-1/models")
      .set("Cookie", buildAuthCookie("ADMIN"));
    expect(models.status).toBe(200);

    const testResult = await request(app)
      .post("/api/v1/ai-provider-profiles/test")
      .set("Cookie", buildAuthCookie("ADMIN"))
      .send({ provider: "MOCK", model: "mock-construction-assistant" });
    expect(testResult.status).toBe(200);
  });
});

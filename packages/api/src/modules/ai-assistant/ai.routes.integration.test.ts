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
    isMember: true,
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
  updateProjectSettings: vi.fn(),
  listProviderProfiles: vi.fn().mockResolvedValue([]),
  createProviderProfile: vi.fn(),
  updateProviderProfile: vi.fn(),
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

  it("cho phép member có AI_ASSISTANT READ xem thread private của mình", async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${PROJECT_ID}/ai-chat/threads`)
      .set("Cookie", buildAuthCookie("ENGINEER"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(aiAssistantServiceMock.listThreads).toHaveBeenCalled();
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
});

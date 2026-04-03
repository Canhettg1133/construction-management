import { beforeEach, describe, expect, it, vi } from "vitest";

const permissionServiceMock = {
  getProjectMembership: vi.fn(),
  getUserProjectPermissions: vi.fn(),
};

vi.mock("../services/permission.service", () => ({
  permissionService: permissionServiceMock,
}));

const {
  requireProjectMembership,
  loadUserPermissions,
  requireToolPermission,
} = await import("./permission.middleware");

function runMiddleware(
  middleware: (req: any, res: any, next: (error?: unknown) => void) => void,
  req: any
) {
  return new Promise<unknown>((resolve) => {
    middleware(req, {}, (error?: unknown) => resolve(error));
  });
}

describe("permission middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireProjectMembership blocks non-member request", async () => {
    permissionServiceMock.getProjectMembership.mockResolvedValue({
      projectId: "p-1",
      userId: "u-1",
      systemRole: "STAFF",
      projectRole: null,
      isMember: false,
      isSystemAdmin: false,
    });

    const req = {
      user: { id: "u-1", email: "u1@example.com", systemRole: "STAFF" },
      params: { projectId: "p-1" },
    };

    const error = await runMiddleware(requireProjectMembership(), req);

    expect(error).toMatchObject({ code: "FORBIDDEN" });
  });

  it("requireProjectMembership optional mode allows non-member", async () => {
    permissionServiceMock.getProjectMembership.mockResolvedValue({
      projectId: "p-1",
      userId: "u-1",
      systemRole: "STAFF",
      projectRole: null,
      isMember: false,
      isSystemAdmin: false,
    });

    const req = {
      user: { id: "u-1", email: "u1@example.com", systemRole: "STAFF" },
      params: { projectId: "p-1" },
    };

    const error = await runMiddleware(requireProjectMembership({ optional: true }), req);

    expect(error).toBeUndefined();
    expect(req.projectMembership).toBeDefined();
  });

  it("loadUserPermissions attaches full permission payload", async () => {
    permissionServiceMock.getUserProjectPermissions.mockResolvedValue({
      projectId: "p-1",
      userId: "u-1",
      systemRole: "STAFF",
      projectRole: "ENGINEER",
      toolPermissions: {
        PROJECT: "READ",
        TASK: "STANDARD",
      },
      specialPrivileges: ["QUALITY_SIGNER"],
      effectiveRole: {
        isAdmin: false,
        canManageMembers: false,
        canApproveSafety: false,
        canApproveQuality: true,
        canApproveBudget: false,
      },
    });

    const req = {
      user: { id: "u-1", email: "u1@example.com", systemRole: "STAFF" },
      params: { projectId: "p-1" },
    };

    const error = await runMiddleware(loadUserPermissions, req);

    expect(error).toBeUndefined();
    expect(req.userPermissions).toBeDefined();
    expect(req.userPermissions.toolPermissions.TASK).toBe("STANDARD");
    expect(req.projectMembership?.isMember).toBe(true);
  });

  it("requireToolPermission blocks when user level below requirement", async () => {
    const req = {
      user: { id: "u-1", email: "u1@example.com", systemRole: "STAFF" },
      params: { projectId: "p-1" },
      userPermissions: {
        toolPermissions: { TASK: "READ" },
      },
    };

    const error = await runMiddleware(requireToolPermission("TASK", "ADMIN"), req);

    expect(error).toMatchObject({ code: "FORBIDDEN" });
  });
});

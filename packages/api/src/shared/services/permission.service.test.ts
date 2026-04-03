import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  projectMember: {
    findUnique: vi.fn(),
  },
  projectToolPermission: {
    findMany: vi.fn(),
  },
  specialPrivilegeAssignment: {
    findMany: vi.fn(),
  },
};

vi.mock("../../config/database", () => ({
  prisma: prismaMock,
}));

const { permissionService } = await import("./permission.service");

describe("permissionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns system admin membership when user is ADMIN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-admin",
      systemRole: "ADMIN",
    });

    const result = await permissionService.getProjectMembership("u-admin", "p-1");

    expect(result).toMatchObject({
      userId: "u-admin",
      projectId: "p-1",
      isSystemAdmin: true,
      isMember: true,
      projectRole: null,
      systemRole: "ADMIN",
    });
    expect(prismaMock.projectMember.findUnique).not.toHaveBeenCalled();
  });

  it("merges role preset and tool overrides", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-engineer",
      systemRole: "STAFF",
    });
    prismaMock.projectMember.findUnique.mockResolvedValue({
      role: "ENGINEER",
    });
    prismaMock.projectToolPermission.findMany.mockResolvedValue([
      { toolId: "TASK", level: "NONE" },
      { toolId: "WAREHOUSE", level: "STANDARD" },
    ]);

    const result = await permissionService.getEffectiveToolPermissions("u-engineer", "p-1");

    expect(result.PROJECT).toBe("READ");
    expect(result.TASK).toBe("NONE");
    expect(result.DAILY_REPORT).toBe("STANDARD");
    expect(result.WAREHOUSE).toBe("STANDARD");
  });

  it("returns false permission for non-member", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-guest",
      systemRole: "STAFF",
    });
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    const has = await permissionService.hasPermission("u-guest", "p-1", "TASK", "READ");

    expect(has).toBe(false);
  });

  it("returns assigned special privilege for member", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u-qc",
      systemRole: "STAFF",
    });
    prismaMock.projectMember.findUnique.mockResolvedValue({
      role: "QUALITY_MANAGER",
    });
    prismaMock.specialPrivilegeAssignment.findMany.mockResolvedValue([
      { privilege: "QUALITY_SIGNER" },
    ]);

    const has = await permissionService.hasSpecialPrivilege("u-qc", "p-1", "QUALITY_SIGNER");

    expect(has).toBe(true);
  });
});


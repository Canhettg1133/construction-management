import jwt from "jsonwebtoken";
import {
  ROLE_PERMISSION_PRESETS,
  TOOL_IDS,
  hasMinPermission,
  type PermissionLevel,
  type ProjectRole,
  type SpecialPrivilege,
  type SystemRole,
  type ToolId,
} from "@construction/shared";

export type TestAuthProfile =
  | "ADMIN"
  | "STAFF"
  | "PROJECT_MANAGER"
  | "ENGINEER"
  | "SAFETY_OFFICER"
  | "QUALITY_MANAGER"
  | "WAREHOUSE_KEEPER"
  | "CLIENT"
  | "VIEWER";

interface TestPrincipal {
  id: string;
  email: string;
  systemRole: SystemRole;
  projectRole: ProjectRole | null;
}

const TEST_PRINCIPALS: Record<TestAuthProfile, TestPrincipal> = {
  ADMIN: {
    id: "admin-user",
    email: "admin@construction.local",
    systemRole: "ADMIN",
    projectRole: null,
  },
  STAFF: {
    id: "staff-user",
    email: "staff@construction.local",
    systemRole: "STAFF",
    projectRole: null,
  },
  PROJECT_MANAGER: {
    id: "project-manager-user",
    email: "pm@construction.local",
    systemRole: "STAFF",
    projectRole: "PROJECT_MANAGER",
  },
  ENGINEER: {
    id: "engineer-user",
    email: "engineer@construction.local",
    systemRole: "STAFF",
    projectRole: "ENGINEER",
  },
  SAFETY_OFFICER: {
    id: "safety-officer-user",
    email: "safety@construction.local",
    systemRole: "STAFF",
    projectRole: "SAFETY_OFFICER",
  },
  QUALITY_MANAGER: {
    id: "quality-manager-user",
    email: "quality@construction.local",
    systemRole: "STAFF",
    projectRole: "QUALITY_MANAGER",
  },
  WAREHOUSE_KEEPER: {
    id: "warehouse-keeper-user",
    email: "warehouse@construction.local",
    systemRole: "STAFF",
    projectRole: "WAREHOUSE_KEEPER",
  },
  CLIENT: {
    id: "client-user",
    email: "client@construction.local",
    systemRole: "STAFF",
    projectRole: "CLIENT",
  },
  VIEWER: {
    id: "viewer-user",
    email: "viewer@construction.local",
    systemRole: "STAFF",
    projectRole: "VIEWER",
  },
};

function buildPermissionMap(level: PermissionLevel) {
  return Object.fromEntries(TOOL_IDS.map((toolId) => [toolId, level])) as Record<ToolId, PermissionLevel>;
}

export function getTestPrincipal(profile: TestAuthProfile = "ADMIN") {
  return TEST_PRINCIPALS[profile];
}

export function buildAuthCookie(profile: TestAuthProfile = "ADMIN") {
  return [`access_token=${signAccessToken(profile)}`];
}

export function signAccessToken(profile: TestAuthProfile = "ADMIN") {
  const principal = getTestPrincipal(profile);
  return jwt.sign(
    {
      id: principal.id,
      email: principal.email,
      systemRole: principal.systemRole,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );
}

export function buildTestUser(profile: TestAuthProfile = "ADMIN") {
  const principal = getTestPrincipal(profile);
  return {
    id: principal.id,
    name: profile.replaceAll("_", " "),
    email: principal.email,
    passwordHash: "hashed-password",
    systemRole: principal.systemRole,
    specialty: null,
    phone: null,
    avatarUrl: null,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

export function createPermissionServiceMock() {
  const findPrincipalById = (userId: string) =>
    Object.values(TEST_PRINCIPALS).find((principal) => principal.id === userId) ?? TEST_PRINCIPALS.VIEWER;

  const buildProjectPermissions = (principal: TestPrincipal) => {
    if (principal.systemRole === "ADMIN") {
      return buildPermissionMap("ADMIN");
    }

    if (!principal.projectRole) {
      return buildPermissionMap("NONE");
    }

    return {
      ...buildPermissionMap("NONE"),
      ...ROLE_PERMISSION_PRESETS[principal.projectRole],
    } as Record<ToolId, PermissionLevel>;
  };

  const getMembership = async (userId: string, projectId: string) => {
    const principal = findPrincipalById(userId);
    return {
      projectId,
      userId,
      systemRole: principal.systemRole,
      projectRole: principal.projectRole,
      isSystemAdmin: principal.systemRole === "ADMIN",
      isMember: principal.systemRole === "ADMIN" || principal.projectRole !== null,
    };
  };

  const getPermissions = async (userId: string, projectId: string) => {
    const principal = findPrincipalById(userId);
    return {
      projectId,
      userId,
      systemRole: principal.systemRole,
      projectRole: principal.projectRole,
      toolPermissions: buildProjectPermissions(principal),
      specialPrivileges: [] as SpecialPrivilege[],
      effectiveRole: {
        isAdmin: principal.systemRole === "ADMIN",
        canManageMembers: principal.systemRole === "ADMIN" || principal.projectRole === "PROJECT_MANAGER",
        canApproveSafety: false,
        canApproveQuality: false,
        canApproveBudget: false,
      },
    };
  };

  return {
    getProjectMembership: getMembership,
    getUserProjectPermissions: getPermissions,
    getEffectiveToolPermissions: async (userId: string) => buildProjectPermissions(findPrincipalById(userId)),
    getSpecialPrivileges: async () => [] as SpecialPrivilege[],
    hasPermission: async (userId: string, _projectId: string, toolId: ToolId, minLevel: PermissionLevel) => {
      const permissions = buildProjectPermissions(findPrincipalById(userId));
      return hasMinPermission(permissions[toolId] ?? "NONE", minLevel);
    },
    hasSpecialPrivilege: async () => false,
  };
}

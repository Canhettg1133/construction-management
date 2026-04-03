import { prisma } from "../../config/database";
import {
  ROLE_PERMISSION_PRESETS,
  SPECIAL_PRIVILEGES,
  TOOL_IDS,
  hasMinPermission,
  type PermissionLevel,
  type ProjectRole,
  type SpecialPrivilege,
  type SystemRole,
  type ToolId,
  type ToolPermissionMap,
  type UserProjectPermissions,
} from "@construction/shared";
import { NotFoundError } from "../errors";

interface ProjectMembershipInfo {
  projectId: string;
  userId: string;
  systemRole: SystemRole;
  projectRole: ProjectRole | null;
  isMember: boolean;
  isSystemAdmin: boolean;
}

function buildPermissionMap(defaultLevel: PermissionLevel): ToolPermissionMap {
  const map: ToolPermissionMap = {};
  for (const toolId of TOOL_IDS) {
    map[toolId] = defaultLevel;
  }
  return map;
}

async function getProjectMembership(userId: string, projectId: string): Promise<ProjectMembershipInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, systemRole: true },
  });

  if (!user) {
    return null;
  }

  if (user.systemRole === "ADMIN") {
    return {
      projectId,
      userId,
      isMember: true,
      isSystemAdmin: true,
      projectRole: null,
      systemRole: user.systemRole as SystemRole,
    };
  }

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });

  return {
    projectId,
    userId,
    isMember: !!member,
    isSystemAdmin: false,
    projectRole: (member?.role as ProjectRole | undefined) ?? null,
    systemRole: user.systemRole as SystemRole,
  };
}

async function getEffectiveToolPermissionsFromMembership(
  userId: string,
  projectId: string,
  membership: ProjectMembershipInfo
): Promise<ToolPermissionMap> {
  if (membership.isSystemAdmin) {
    return buildPermissionMap("ADMIN");
  }

  if (!membership.isMember || !membership.projectRole) {
    return buildPermissionMap("NONE");
  }

  const overrides = await prisma.projectToolPermission.findMany({
    where: { projectId, userId },
    select: { toolId: true, level: true },
  });

  const merged: ToolPermissionMap = {
    ...buildPermissionMap("NONE"),
    ...ROLE_PERMISSION_PRESETS[membership.projectRole],
  };

  for (const override of overrides) {
    merged[override.toolId as ToolId] = override.level as PermissionLevel;
  }

  return merged;
}

async function getEffectiveToolPermissions(userId: string, projectId: string): Promise<ToolPermissionMap> {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) {
    return buildPermissionMap("NONE");
  }

  return getEffectiveToolPermissionsFromMembership(userId, projectId, membership);
}

async function getSpecialPrivilegesFromMembership(
  userId: string,
  projectId: string,
  membership: ProjectMembershipInfo
): Promise<SpecialPrivilege[]> {
  if (membership.isSystemAdmin) {
    return [...SPECIAL_PRIVILEGES];
  }

  if (!membership.isMember) {
    return [];
  }

  const assignments = await prisma.specialPrivilegeAssignment.findMany({
    where: { projectId, userId },
    select: { privilege: true },
  });

  return assignments.map((item) => item.privilege);
}

async function getSpecialPrivileges(userId: string, projectId: string): Promise<SpecialPrivilege[]> {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) {
    return [];
  }

  return getSpecialPrivilegesFromMembership(userId, projectId, membership);
}

async function getUserProjectPermissions(userId: string, projectId: string): Promise<UserProjectPermissions> {
  const membership = await getProjectMembership(userId, projectId);
  if (!membership) {
    throw new NotFoundError("Không tìm thấy người dùng");
  }

  const [toolPermissions, specialPrivileges] = await Promise.all([
    getEffectiveToolPermissionsFromMembership(userId, projectId, membership),
    getSpecialPrivilegesFromMembership(userId, projectId, membership),
  ]);

  const projectLevel = toolPermissions.PROJECT ?? "NONE";

  return {
    projectId,
    userId,
    systemRole: membership.systemRole,
    projectRole: membership.projectRole as UserProjectPermissions["projectRole"],
    toolPermissions,
    specialPrivileges,
    effectiveRole: {
      isAdmin: membership.isSystemAdmin || projectLevel === "ADMIN",
      canManageMembers: hasMinPermission(projectLevel, "ADMIN"),
      canApproveSafety: specialPrivileges.includes("SAFETY_SIGNER"),
      canApproveQuality: specialPrivileges.includes("QUALITY_SIGNER"),
      canApproveBudget: specialPrivileges.includes("BUDGET_APPROVER"),
    },
  };
}

async function hasPermission(
  userId: string,
  projectId: string,
  toolId: ToolId,
  minLevel: PermissionLevel
): Promise<boolean> {
  const toolPermissions = await getEffectiveToolPermissions(userId, projectId);
  const userLevel = toolPermissions[toolId] ?? "NONE";
  return hasMinPermission(userLevel, minLevel);
}

async function hasSpecialPrivilege(
  userId: string,
  projectId: string,
  privilege: SpecialPrivilege
): Promise<boolean> {
  const privileges = await getSpecialPrivileges(userId, projectId);
  return privileges.includes(privilege);
}

export const permissionService = {
  getProjectMembership,
  getEffectiveToolPermissions,
  getSpecialPrivileges,
  getUserProjectPermissions,
  hasPermission,
  hasSpecialPrivilege,
};

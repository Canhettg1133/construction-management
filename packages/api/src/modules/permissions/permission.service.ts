import {
  PERMISSION_LEVELS,
  SPECIAL_PRIVILEGES,
  TOOL_IDS,
  type PermissionLevel,
  type SpecialPrivilege,
  type ToolId,
} from "@construction/shared";
import { prisma } from "../../config/database";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { permissionService as sharedPermissionService } from "../../shared/services/permission.service";

function assertToolId(toolId: string): ToolId {
  if (!TOOL_IDS.includes(toolId as ToolId)) {
    throw new BadRequestError("ToolId khong hop le");
  }
  return toolId as ToolId;
}

function assertPermissionLevel(level: string): PermissionLevel {
  if (!PERMISSION_LEVELS.includes(level as PermissionLevel)) {
    throw new BadRequestError("Permission level khong hop le");
  }
  return level as PermissionLevel;
}

function assertSpecialPrivilege(privilege: string): SpecialPrivilege {
  if (!SPECIAL_PRIVILEGES.includes(privilege as SpecialPrivilege)) {
    throw new BadRequestError("Special privilege khong hop le");
  }
  return privilege as SpecialPrivilege;
}

async function ensureProjectExists(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      progress: true,
      startDate: true,
      endDate: true,
      _count: {
        select: {
          members: true,
          toolPermissions: true,
          specialPrivileges: true,
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError("Khong tim thay du an");
  }

  return project;
}

async function ensureMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true, userId: true, role: true },
  });

  if (!member) {
    throw new NotFoundError("Nguoi dung khong thuoc du an");
  }

  return member;
}

export const projectPermissionService = {
  async getProjectSettings(projectId: string) {
    const project = await ensureProjectExists(projectId);
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      progress: project.progress,
      startDate: project.startDate,
      endDate: project.endDate,
      memberCount: project._count.members,
      overrideCount: project._count.toolPermissions,
      privilegeAssignmentCount: project._count.specialPrivileges,
    };
  },

  async getProjectPermissionMatrix(projectId: string) {
    await ensureProjectExists(projectId);

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            systemRole: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const computedPermissions = await Promise.all(
      members.map((member) =>
        sharedPermissionService.getUserProjectPermissions(member.userId, projectId)
      )
    );

    const permissionByUser = new Map(
      computedPermissions.map((permissions) => [permissions.userId, permissions])
    );

    const overrides = await prisma.projectToolPermission.findMany({
      where: { projectId },
      orderBy: [{ userId: "asc" }, { toolId: "asc" }],
    });

    const specialPrivilegeAssignments = await prisma.specialPrivilegeAssignment.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        granter: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ userId: "asc" }, { grantedAt: "desc" }],
    });

    return {
      projectId,
      members: members.map((member) => {
        const permissions = permissionByUser.get(member.userId);
        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          user: member.user,
          toolPermissions: permissions?.toolPermissions ?? {},
          specialPrivileges: permissions?.specialPrivileges ?? [],
          effectiveRole: permissions?.effectiveRole ?? null,
        };
      }),
      overrides,
      specialPrivilegeAssignments,
    };
  },

  async upsertToolPermissionOverride(params: {
    projectId: string;
    userId: string;
    toolId: string;
    level: string;
  }) {
    const toolId = assertToolId(params.toolId);
    const level = assertPermissionLevel(params.level);

    await ensureProjectExists(params.projectId);
    await ensureMember(params.projectId, params.userId);

    return prisma.projectToolPermission.upsert({
      where: {
        projectId_userId_toolId: {
          projectId: params.projectId,
          userId: params.userId,
          toolId,
        },
      },
      create: {
        projectId: params.projectId,
        userId: params.userId,
        toolId,
        level,
      },
      update: {
        level,
      },
    });
  },

  async removeToolPermissionOverride(params: {
    projectId: string;
    userId: string;
    toolId: string;
  }) {
    const toolId = assertToolId(params.toolId);

    await ensureProjectExists(params.projectId);

    const result = await prisma.projectToolPermission.deleteMany({
      where: {
        projectId: params.projectId,
        userId: params.userId,
        toolId,
      },
    });

    return { deletedCount: result.count };
  },

  async assignSpecialPrivilege(params: {
    projectId: string;
    userId: string;
    privilege: string;
    grantedBy: string;
  }) {
    const privilege = assertSpecialPrivilege(params.privilege);

    await ensureProjectExists(params.projectId);
    await ensureMember(params.projectId, params.userId);

    return prisma.specialPrivilegeAssignment.upsert({
      where: {
        projectId_userId_privilege: {
          projectId: params.projectId,
          userId: params.userId,
          privilege,
        },
      },
      create: {
        projectId: params.projectId,
        userId: params.userId,
        privilege,
        grantedBy: params.grantedBy,
      },
      update: {
        grantedBy: params.grantedBy,
        grantedAt: new Date(),
      },
    });
  },

  async revokeSpecialPrivilege(params: {
    projectId: string;
    assignmentId: string;
  }) {
    const assignment = await prisma.specialPrivilegeAssignment.findUnique({
      where: { id: params.assignmentId },
      select: { id: true, projectId: true },
    });

    if (!assignment || assignment.projectId !== params.projectId) {
      throw new NotFoundError("Khong tim thay phan quyen dac biet");
    }

    await prisma.specialPrivilegeAssignment.delete({
      where: { id: params.assignmentId },
    });

    return { id: params.assignmentId, deleted: true };
  },
};

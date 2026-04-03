import type {
  PermissionLevel,
  ProjectRole,
  ProjectToolPermission,
  SpecialPrivilege,
  SpecialPrivilegeAssignment,
  ToolId,
  ToolPermissionMap,
  User,
} from "@construction/shared";
import api from "../../../config/api";

interface ApiSingleResponse<T> {
  success: true;
  data: T;
}

export interface ProjectSettingsSummary {
  id: string;
  code: string;
  name: string;
  status: string;
  progress: number | string;
  startDate: string;
  endDate?: string | null;
  memberCount: number;
  overrideCount: number;
  privilegeAssignmentCount: number;
}

export interface PermissionMatrixMember {
  id: string;
  userId: string;
  role: ProjectRole;
  user: Pick<User, "id" | "name" | "email" | "systemRole" | "isActive">;
  toolPermissions: ToolPermissionMap;
  specialPrivileges: SpecialPrivilege[];
  effectiveRole: {
    isAdmin: boolean;
    canManageMembers: boolean;
    canApproveSafety: boolean;
    canApproveQuality: boolean;
    canApproveBudget: boolean;
  } | null;
}

export interface ProjectPermissionMatrixResponse {
  projectId: string;
  members: PermissionMatrixMember[];
  overrides: ProjectToolPermission[];
  specialPrivilegeAssignments: Array<
    SpecialPrivilegeAssignment & {
      user: Pick<User, "id" | "name" | "email">;
      granter?: Pick<User, "id" | "name" | "email"> | null;
    }
  >;
}

export const projectSettingsApi = {
  async getSettings(projectId: string) {
    const response = await api.get<ApiSingleResponse<ProjectSettingsSummary>>(
      `/projects/${projectId}/settings`
    );
    return response.data.data;
  },

  async getPermissionMatrix(projectId: string) {
    const response = await api.get<ApiSingleResponse<ProjectPermissionMatrixResponse>>(
      `/projects/${projectId}/settings/permissions`
    );
    return response.data.data;
  },

  async upsertPermissionOverride(params: {
    projectId: string;
    userId: string;
    toolId: ToolId;
    level: PermissionLevel;
  }) {
    const response = await api.post<ApiSingleResponse<ProjectToolPermission>>(
      `/projects/${params.projectId}/settings/permissions/override`,
      {
        userId: params.userId,
        toolId: params.toolId,
        level: params.level,
      }
    );
    return response.data.data;
  },

  async removePermissionOverride(params: {
    projectId: string;
    userId: string;
    toolId: ToolId;
  }) {
    const response = await api.delete<ApiSingleResponse<{ deletedCount: number }>>(
      `/projects/${params.projectId}/settings/permissions/override/${params.userId}/${params.toolId}`
    );
    return response.data.data;
  },

  async assignSpecialPrivilege(params: {
    projectId: string;
    userId: string;
    privilege: SpecialPrivilege;
  }) {
    const response = await api.post<ApiSingleResponse<SpecialPrivilegeAssignment>>(
      `/projects/${params.projectId}/settings/privileges/assign`,
      {
        userId: params.userId,
        privilege: params.privilege,
      }
    );
    return response.data.data;
  },

  async revokeSpecialPrivilege(projectId: string, assignmentId: string) {
    const response = await api.delete<ApiSingleResponse<{ id: string; deleted: boolean }>>(
      `/projects/${projectId}/settings/privileges/${assignmentId}`
    );
    return response.data.data;
  },
};

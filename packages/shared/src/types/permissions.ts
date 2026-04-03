export * from "./roles"

import type {
  ProjectMember,
  ProjectToolPermission,
  SpecialPrivilegeAssignment,
} from "./entities"
import type {
  ProjectRole,
  SpecialPrivilege,
  SystemRole,
  ToolPermissionMap,
} from "./roles"

export interface ProjectMembership {
  projectId: string
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
  isMember: boolean
  isSystemAdmin: boolean
}

export interface UserProjectPermissions {
  projectId: string
  userId: string
  systemRole: SystemRole
  projectRole: ProjectRole | null
  toolPermissions: ToolPermissionMap
  specialPrivileges: SpecialPrivilege[]
  effectiveRole: {
    isAdmin: boolean
    canManageMembers: boolean
    canApproveSafety: boolean
    canApproveQuality: boolean
    canApproveBudget: boolean
  }
}

export interface ProjectMemberWithPermissions extends ProjectMember {
  toolPermissions?: ProjectToolPermission[]
  specialPrivileges?: SpecialPrivilegeAssignment[]
  computedPermissions?: UserProjectPermissions["effectiveRole"]
}

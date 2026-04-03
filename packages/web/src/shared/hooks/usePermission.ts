import { hasMinPermission, type PermissionLevel, type ToolId } from "@construction/shared";
import { useProjectPermissions } from "./useProjectPermissions";

interface UsePermissionOptions {
  projectId: string;
  toolId: ToolId;
  minLevel?: PermissionLevel;
}

export function usePermission({ projectId, toolId, minLevel = "READ" }: UsePermissionOptions) {
  const { data: permissions, isLoading } = useProjectPermissions(projectId);
  const userLevel = permissions?.toolPermissions?.[toolId] ?? "NONE";
  const has = hasMinPermission(userLevel, minLevel);

  return {
    has,
    isLoading,
    permissions,
    isAdmin: permissions?.effectiveRole?.isAdmin ?? false,
    canManageMembers: permissions?.effectiveRole?.canManageMembers ?? false,
  }
}

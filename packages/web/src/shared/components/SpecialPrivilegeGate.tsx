import type { SpecialPrivilege } from "@construction/shared";
import { useProjectPermissions } from "../hooks/useProjectPermissions";

interface SpecialPrivilegeGateProps {
  projectId: string;
  privilege: SpecialPrivilege;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SpecialPrivilegeGate({
  projectId,
  privilege,
  children,
  fallback = null,
}: SpecialPrivilegeGateProps) {
  const { data: permissions, isLoading } = useProjectPermissions(projectId);
  if (isLoading) {
    return null;
  }

  const has = permissions?.specialPrivileges?.includes(privilege) ?? false;
  return has ? <>{children}</> : <>{fallback}</>;
}


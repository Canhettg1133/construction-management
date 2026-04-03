import type { PermissionLevel, ToolId } from "@construction/shared";
import { usePermission } from "../hooks/usePermission";

interface PermissionGateProps {
  projectId: string;
  toolId: ToolId;
  minLevel?: PermissionLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  projectId,
  toolId,
  minLevel = "READ",
  children,
  fallback = null,
}: PermissionGateProps) {
  const { has, isLoading } = usePermission({ projectId, toolId, minLevel });
  if (isLoading) {
    return null;
  }
  return has ? <>{children}</> : <>{fallback}</>;
}


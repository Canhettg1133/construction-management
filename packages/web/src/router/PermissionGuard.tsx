import type { PermissionLevel, ProjectRole, SpecialPrivilege, SystemRole, ToolId } from "@construction/shared";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { AccessDeniedPage } from "../shared/components/AccessDeniedPage";
import { usePermission } from "../shared/hooks/usePermission";
import { useProjectPermissions } from "../shared/hooks/useProjectPermissions";
import { ROUTES } from "../shared/constants/routes";
import { useAuthStore } from "../store/authStore";

interface PermissionGuardProps {
  // deprecated alias for systemRoles, keep for backward compatibility
  roles?: SystemRole[];
  systemRoles?: SystemRole[];
  projectRoles?: ProjectRole[];
  projectId?: string;
  toolId?: ToolId;
  minLevel?: PermissionLevel;
  privilege?: SpecialPrivilege;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

interface DenyOptions {
  requiredRole?: string;
  requiredTool?: ToolId;
  requiredPrivilege?: SpecialPrivilege;
  description?: string;
}

export function PermissionGuard({
  roles,
  systemRoles,
  projectRoles,
  projectId,
  toolId,
  minLevel = "READ",
  privilege,
  children,
  fallback,
  redirectTo,
}: PermissionGuardProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const params = useParams<{ id?: string; projectId?: string }>();

  const resolvedProjectId = projectId ?? params.projectId ?? params.id ?? "";
  const shouldLoadProjectPermissions = Boolean(resolvedProjectId);

  const { data: projectPermissions, isLoading: isProjectPermissionLoading } = useProjectPermissions(
    shouldLoadProjectPermissions ? resolvedProjectId : ""
  );

  // Keep using usePermission for tool checks as requested in Phase 3 design.
  const toolCheckTarget = toolId ?? "PROJECT";
  const toolCheckProjectId = toolId ? resolvedProjectId : "";
  const { has: hasToolPermission, isLoading: isToolPermissionLoading } = usePermission({
    projectId: toolCheckProjectId,
    toolId: toolCheckTarget,
    minLevel,
  });

  const resolveDeny = ({ requiredRole, requiredTool, requiredPrivilege, description }: DenyOptions) => {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />;
    }
    return (
      <AccessDeniedPage
        requiredRole={requiredRole}
        requiredTool={requiredTool}
        requiredPrivilege={requiredPrivilege}
        description={description}
      />
    );
  };

  // 1) Not logged in -> redirect /login
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // 2) Check system roles
  const acceptedSystemRoles = systemRoles ?? roles;
  if (acceptedSystemRoles && acceptedSystemRoles.length > 0 && !acceptedSystemRoles.includes(user.systemRole)) {
    return resolveDeny({
      requiredRole: acceptedSystemRoles.join(", "),
      description: "Tai khoan hien tai khong nam trong nhom vai tro duoc phep.",
    });
  }

  // 3) Check project roles
  if (projectRoles && projectRoles.length > 0) {
    if (!resolvedProjectId) {
      return resolveDeny({
        description: "Khong xac dinh duoc du an de kiem tra vai tro.",
      });
    }

    if (isProjectPermissionLoading) {
      return null;
    }

    const isSystemAdmin = user.systemRole === "ADMIN";
    const hasProjectRole =
      projectPermissions?.projectRole !== null &&
      projectPermissions?.projectRole !== undefined &&
      projectRoles.includes(projectPermissions.projectRole);

    if (!isSystemAdmin && !hasProjectRole) {
      return resolveDeny({
        requiredRole: projectRoles.join(", "),
        description: "Vai tro trong du an khong du dieu kien truy cap.",
      });
    }
  }

  // 4) Check tool permissions
  if (toolId) {
    if (!resolvedProjectId) {
      return resolveDeny({
        requiredTool: toolId,
        description: "Khong xac dinh duoc du an de kiem tra quyen cong cu.",
      });
    }

    if (isToolPermissionLoading) {
      return null;
    }

    if (!hasToolPermission) {
      return resolveDeny({ requiredTool: toolId });
    }
  }

  // 5) Check special privilege
  if (privilege) {
    if (!resolvedProjectId) {
      return resolveDeny({
        requiredPrivilege: privilege,
        description: "Khong xac dinh duoc du an de kiem tra quyen dac biet.",
      });
    }

    if (isProjectPermissionLoading) {
      return null;
    }

    const hasPrivilege = projectPermissions?.specialPrivileges?.includes(privilege) ?? false;
    if (!hasPrivilege) {
      return resolveDeny({ requiredPrivilege: privilege });
    }
  }

  // 6) Passed all checks
  return <>{children}</>;
}

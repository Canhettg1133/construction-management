import { useMemo } from "react";
import type { ProjectRole, SystemRole } from "@construction/shared";
import { useAuthStore } from "../../../store/authStore";

type DashboardPrimaryRole =
  | "ADMIN"
  | "PM"
  | "ENGINEER"
  | "SAFETY"
  | "QUALITY"
  | "WAREHOUSE"
  | "CLIENT"
  | "VIEWER"
  | "STAFF";

interface UserWithProjectRoles {
  projectRole?: ProjectRole | null;
  projectRoles?: ProjectRole[];
}

function uniqueRoles(roles: Array<ProjectRole | null | undefined>): ProjectRole[] {
  return Array.from(
    new Set(
      roles.filter((role): role is ProjectRole => typeof role === "string" && role.length > 0)
    )
  );
}

export interface DashboardRoleContext {
  primaryRole: DashboardPrimaryRole;
  systemRole: SystemRole | null;
  projectRoles: ProjectRole[];
  isAdmin: boolean;
  isPM: boolean;
  isEngineer: boolean;
  isSafety: boolean;
  isQuality: boolean;
  isWarehouse: boolean;
  isClient: boolean;
  isViewer: boolean;
  showTaskStats: boolean;
  showSafetyStats: boolean;
  showQualityStats: boolean;
  showWarehouseStats: boolean;
  showBudgetStats: boolean;
  showOverdueTasks: boolean;
  showRiskyProjects: boolean;
  showPendingApprovals: boolean;
  showActiveMembers: boolean;
}

export function useDashboardRole(): DashboardRoleContext {
  const user = useAuthStore((state) => state.user);
  const projectPermissions = useAuthStore((state) => state.projectPermissions);

  return useMemo(() => {
    const systemRole = user?.systemRole ?? null;
    const userWithProjectRoles = (user as (typeof user & UserWithProjectRoles) | null) ?? null;
    const permissionProjectRoles = Object.values(projectPermissions).map(
      (permission) => permission.projectRole
    );
    const projectRoles = uniqueRoles([
      ...(userWithProjectRoles?.projectRoles ?? []),
      userWithProjectRoles?.projectRole,
      ...permissionProjectRoles,
    ]);

    const roleSet = new Set(projectRoles);
    const hasRole = (role: ProjectRole) => roleSet.has(role);

    const isAdmin = systemRole === "ADMIN";
    const isPM = hasRole("PROJECT_MANAGER");
    const isSafety = hasRole("SAFETY_OFFICER");
    const isQuality = hasRole("QUALITY_MANAGER");
    const isWarehouse = hasRole("WAREHOUSE_KEEPER");
    const isEngineer = hasRole("ENGINEER") || hasRole("DESIGN_ENGINEER");
    const isClient = hasRole("CLIENT");
    const isViewer = hasRole("VIEWER") || (systemRole === "STAFF" && projectRoles.length === 0);

    const primaryRole: DashboardPrimaryRole = isAdmin
      ? "ADMIN"
      : isPM
      ? "PM"
      : isSafety
      ? "SAFETY"
      : isQuality
      ? "QUALITY"
      : isWarehouse
      ? "WAREHOUSE"
      : isEngineer
      ? "ENGINEER"
      : isClient
      ? "CLIENT"
      : isViewer
      ? "VIEWER"
      : systemRole === "STAFF"
      ? "STAFF"
      : "VIEWER";

    return {
      primaryRole,
      systemRole,
      projectRoles,
      isAdmin,
      isPM,
      isEngineer,
      isSafety,
      isQuality,
      isWarehouse,
      isClient,
      isViewer,
      showTaskStats: isAdmin || isPM || isSafety || isQuality || isWarehouse,
      showSafetyStats: isAdmin || isPM || isSafety || isQuality,
      showQualityStats: true,
      showWarehouseStats: isAdmin || isPM || isSafety || isQuality || isWarehouse,
      showBudgetStats: isAdmin || isPM || isClient,
      showOverdueTasks: isAdmin || isPM || isSafety || isQuality,
      showRiskyProjects: isAdmin || isPM,
      showPendingApprovals: isAdmin || isPM || isEngineer || isSafety || isQuality,
      showActiveMembers: isAdmin || isPM,
    };
  }, [projectPermissions, user]);
}


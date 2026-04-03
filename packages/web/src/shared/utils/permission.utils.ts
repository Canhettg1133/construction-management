import {
  PROJECT_ROLE_LABELS,
  ROLE_PERMISSION_PRESETS,
  hasMinPermission,
  type ProjectRole,
} from "@construction/shared";

export function canEditTask(
  projectRole: ProjectRole | null,
  isSystemAdmin: boolean,
  taskCreatorId: string,
  taskAssigneeId: string | null,
  currentUserId: string
): boolean {
  if (isSystemAdmin || projectRole === "PROJECT_MANAGER") return true;
  if (taskCreatorId === currentUserId || taskAssigneeId === currentUserId) return true;
  return false;
}

export function canSubmitReport(
  projectRole: ProjectRole | null,
  isSystemAdmin: boolean,
  reportCreatorId: string,
  currentUserId: string
): boolean {
  if (isSystemAdmin) return true;
  if (!projectRole) return false;
  const toolLevel = ROLE_PERMISSION_PRESETS[projectRole]?.DAILY_REPORT ?? "NONE";
  if (!hasMinPermission(toolLevel, "STANDARD")) return false;
  return reportCreatorId === currentUserId;
}

export function getRoleLabel(projectRole: ProjectRole | null): string {
  if (!projectRole) return "Không xác định";
  return PROJECT_ROLE_LABELS[projectRole] ?? projectRole;
}


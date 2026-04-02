import { useAuthStore } from "../../store/authStore";

export function usePermission() {
  const hasRole = useAuthStore((s) => s.hasRole);
  return { hasRole, isAdmin: () => hasRole(["ADMIN"]), isPM: () => hasRole(["ADMIN", "PROJECT_MANAGER"]), canEdit: () => hasRole(["ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"]) };
}

import type { SystemRole } from "@construction/shared";
import { PermissionGuard } from "./PermissionGuard";

interface RoleGuardProps {
  roles: SystemRole[];
  children: React.ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  return <PermissionGuard systemRoles={roles}>{children}</PermissionGuard>;
}

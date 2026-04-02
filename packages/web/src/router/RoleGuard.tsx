import { Navigate, useLocation } from "react-router-dom";
import type { UserRole } from "@construction/shared";
import { useAuthStore } from "../store/authStore";
import { ROUTES } from "../shared/constants/routes";

interface RoleGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  const normalizedRole = user.role?.toUpperCase?.() as UserRole;

  if (!roles.includes(normalizedRole)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}

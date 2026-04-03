import type { ProjectRole, SystemRole, UserProjectPermissions } from "@construction/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        systemRole: SystemRole;
      };
      projectMembership?: {
        projectId: string;
        userId: string;
        systemRole: SystemRole;
        projectRole: ProjectRole | null;
        isMember: boolean;
        isSystemAdmin: boolean;
      };
      userPermissions?: UserProjectPermissions;
    }
  }
}

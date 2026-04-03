import { Router } from "express";
import { permissionController } from "./permission.controller";
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
} from "../../shared/middleware";

const permissionRouter: Router = Router({ mergeParams: true });

permissionRouter.use(authenticate);
permissionRouter.get(
  "/:projectId",
  requireProjectMembership(),
  loadUserPermissions,
  asyncHandler(permissionController.getProjectPermissions)
);

export const projectSettingsPermissionRoutes: Router = Router({ mergeParams: true });

projectSettingsPermissionRoutes.use(authenticate);
projectSettingsPermissionRoutes.use(requireProjectMembership());
projectSettingsPermissionRoutes.use(loadUserPermissions);
projectSettingsPermissionRoutes.use(requireToolPermission("PROJECT", "ADMIN"));

projectSettingsPermissionRoutes.get("/", asyncHandler(permissionController.getProjectSettings));
projectSettingsPermissionRoutes.get(
  "/permissions",
  asyncHandler(permissionController.getProjectPermissionMatrix)
);
projectSettingsPermissionRoutes.post(
  "/permissions/override",
  asyncHandler(permissionController.upsertToolPermissionOverride)
);
projectSettingsPermissionRoutes.delete(
  "/permissions/override/:userId/:toolId",
  asyncHandler(permissionController.removeToolPermissionOverride)
);
projectSettingsPermissionRoutes.post(
  "/privileges/assign",
  asyncHandler(permissionController.assignSpecialPrivilege)
);
projectSettingsPermissionRoutes.delete(
  "/privileges/:assignmentId",
  asyncHandler(permissionController.revokeSpecialPrivilege)
);

export default permissionRouter;

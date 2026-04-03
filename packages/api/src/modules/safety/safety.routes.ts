import { Router } from "express";
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireSpecialPrivilege,
  requireToolPermission,
} from "../../shared/middleware";
import { safetyController } from "./safety.controller";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("SAFETY", "READ"), asyncHandler(safetyController.list));
router.get("/:reportId", requireToolPermission("SAFETY", "READ"), asyncHandler(safetyController.getById));
router.post("/", requireToolPermission("SAFETY", "STANDARD"), asyncHandler(safetyController.create));
router.patch("/:reportId", requireToolPermission("SAFETY", "STANDARD"), asyncHandler(safetyController.update));
router.post(
  "/:reportId/sign",
  requireSpecialPrivilege("SAFETY_SIGNER"),
  asyncHandler(safetyController.sign)
);

export default router;

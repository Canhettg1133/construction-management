import { Router } from "express";
import {
  asyncHandler,
  authenticate,
  loadUserPermissions,
  requireProjectMembership,
  requireSpecialPrivilege,
  requireToolPermission,
} from "../../shared/middleware";
import { qualityController } from "./quality.controller";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("QUALITY", "READ"), asyncHandler(qualityController.list));
router.get("/:reportId", requireToolPermission("QUALITY", "READ"), asyncHandler(qualityController.getById));
router.post("/", requireToolPermission("QUALITY", "STANDARD"), asyncHandler(qualityController.create));
router.patch("/:reportId", requireToolPermission("QUALITY", "STANDARD"), asyncHandler(qualityController.update));
router.post(
  "/:reportId/sign",
  requireSpecialPrivilege("QUALITY_SIGNER"),
  asyncHandler(qualityController.sign)
);

export default router;

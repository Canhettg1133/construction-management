import { Router } from "express";
import { memberController } from "./member.controller";
import {
  authenticate,
  validate,
  asyncHandler,
  loadUserPermissions,
  requireProjectMembership,
  requireToolPermission,
} from "../../shared/middleware";
import { addMemberSchema, updateMemberRoleSchema } from "./member.validation";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireProjectMembership());
router.use(loadUserPermissions);

router.get("/", requireToolPermission("PROJECT", "READ"), asyncHandler(memberController.list));
router.post("/", requireToolPermission("PROJECT", "ADMIN"), validate(addMemberSchema), asyncHandler(memberController.add));
router.patch("/:memberId", requireToolPermission("PROJECT", "ADMIN"), validate(updateMemberRoleSchema), asyncHandler(memberController.updateRole));
router.delete("/:memberId", requireToolPermission("PROJECT", "ADMIN"), asyncHandler(memberController.remove));

export default router;

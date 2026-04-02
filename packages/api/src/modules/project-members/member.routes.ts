import { Router } from "express";
import { memberController } from "./member.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { addMemberSchema, updateMemberRoleSchema } from "./member.validation";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", asyncHandler(memberController.list));
router.post("/", authorize("ADMIN", "PROJECT_MANAGER"), validate(addMemberSchema), asyncHandler(memberController.add));
router.patch("/:memberId", authorize("ADMIN", "PROJECT_MANAGER"), validate(updateMemberRoleSchema), asyncHandler(memberController.updateRole));
router.delete("/:memberId", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(memberController.remove));

export default router;

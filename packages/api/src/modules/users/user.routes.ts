import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { createUserSchema, updateUserSchema, toggleStatusSchema } from "./user.validation";

const router: Router = Router();

router.use(authenticate);

// Users can update their own profile; admin can update any user
router.patch("/me", asyncHandler(userController.updateMe));
router.patch("/:id", authorize("ADMIN"), validate(updateUserSchema), asyncHandler(userController.update));
router.get("/:id", authorize("ADMIN"), asyncHandler(userController.getById));
router.get("/", authorize("ADMIN"), asyncHandler(userController.list));
router.post("/", authorize("ADMIN"), validate(createUserSchema), asyncHandler(userController.create));
router.patch("/:id/status", authorize("ADMIN"), validate(toggleStatusSchema), asyncHandler(userController.toggleStatus));

export default router;

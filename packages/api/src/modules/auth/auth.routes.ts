import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate, validate, asyncHandler } from "../../shared/middleware";
import { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "./auth.validation";

const router: Router = Router();

router.post("/login", validate(loginSchema), asyncHandler(authController.login));
router.post("/logout", authenticate, asyncHandler(authController.logout));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post("/reset-password", validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
router.post("/change-password", authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;

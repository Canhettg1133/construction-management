import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authenticate, asyncHandler } from "../../shared/middleware";

const router: Router = Router();

router.use(authenticate);
router.get("/stats", asyncHandler(dashboardController.getStats));

export default router;

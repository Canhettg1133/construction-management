import { Router } from "express";
import { auditController } from "./audit.controller";
import { authenticate, authorize, asyncHandler } from "../../shared/middleware";

const router: Router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", asyncHandler(auditController.list));

export default router;

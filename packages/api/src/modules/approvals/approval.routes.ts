import { Router } from "express";
import { approvalController } from "./approval.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { rejectSchema } from "./approval.validation";

const router: Router = Router();

router.use(authenticate);

// List pending approvals
router.get("/", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(approvalController.listPending));

// Report actions
router.post("/reports/:reportId/approve", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(approvalController.approveReport));
router.post("/reports/:reportId/reject", authorize("ADMIN", "PROJECT_MANAGER"), validate(rejectSchema), asyncHandler(approvalController.rejectReport));

// Task actions
router.post("/tasks/:taskId/approve", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(approvalController.approveTask));
router.post("/tasks/:taskId/reject", authorize("ADMIN", "PROJECT_MANAGER"), validate(rejectSchema), asyncHandler(approvalController.rejectTask));

export default router;

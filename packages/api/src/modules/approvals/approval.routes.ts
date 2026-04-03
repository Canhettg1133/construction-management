import { Router } from "express";
import { approvalController } from "./approval.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { rejectSchema } from "./approval.validation";

const router: Router = Router();

router.use(authenticate);

// List pending approvals — only ADMIN can view pending items
router.get("/", authorize("ADMIN", "STAFF"), asyncHandler(approvalController.listPending));

// Report actions
router.post("/reports/:reportId/approve", asyncHandler(approvalController.approveReport));
router.post("/reports/:reportId/reject", validate(rejectSchema), asyncHandler(approvalController.rejectReport));

// Task actions
router.post("/tasks/:taskId/approve", asyncHandler(approvalController.approveTask));
router.post("/tasks/:taskId/reject", validate(rejectSchema), asyncHandler(approvalController.rejectTask));

export default router;

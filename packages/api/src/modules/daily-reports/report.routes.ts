import { Router } from "express";
import { reportController } from "./report.controller";
import { authenticate, authorize, validate, asyncHandler } from "../../shared/middleware";
import { createReportSchema, updateReportSchema, updateReportStatusSchema } from "./report.validation";

const router: Router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", asyncHandler(reportController.list));
router.get("/:reportId", asyncHandler(reportController.getById));
router.post("/", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(createReportSchema), asyncHandler(reportController.create));
router.patch("/:reportId", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(updateReportSchema), asyncHandler(reportController.update));
router.patch("/:reportId/status", authorize("ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER"), validate(updateReportStatusSchema), asyncHandler(reportController.updateStatus));
router.delete("/:reportId", authorize("ADMIN", "PROJECT_MANAGER"), asyncHandler(reportController.delete));

export default router;

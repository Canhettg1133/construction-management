import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import projectRoutes from "../modules/projects/project.routes";
import memberRoutes from "../modules/project-members/member.routes";
import reportRoutes from "../modules/daily-reports/report.routes";
import reportImageRoutes from "../modules/daily-reports/report-image.routes";
import taskRoutes from "../modules/tasks/task.routes";
import fileRoutes from "../modules/files/file.routes";
import auditRoutes from "../modules/audit/audit.routes";
import dashboardRoutes from "../modules/dashboard/dashboard.routes";
import healthRoutes from "../modules/health/health.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import approvalRoutes from "../modules/approvals/approval.routes";
import permissionRoutes, {
  projectSettingsPermissionRoutes,
} from "../modules/permissions/permission.routes";
import safetyRoutes from "../modules/safety/safety.routes";
import qualityRoutes from "../modules/quality/quality.routes";
import warehouseRoutes from "../modules/warehouse/warehouse.routes";
import budgetRoutes from "../modules/budget/budget.routes";
import { documentRoutes, projectDocumentRoutes } from "../modules/documents/document.routes";

const router: Router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/projects/:projectId/members", memberRoutes);
router.use("/projects/:projectId/reports", reportRoutes);
router.use("/projects/:projectId/reports/:reportId/images", reportImageRoutes);
router.use("/projects/:projectId/tasks", taskRoutes);
router.use("/projects/:projectId/files", fileRoutes);
router.use("/projects/:projectId/documents", projectDocumentRoutes);
router.use("/projects/:projectId/safety", safetyRoutes);
router.use("/projects/:projectId/quality", qualityRoutes);
router.use("/projects/:projectId/warehouse", warehouseRoutes);
router.use("/projects/:projectId/budget", budgetRoutes);
router.use("/projects/:projectId/settings", projectSettingsPermissionRoutes);
router.use("/documents", documentRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);
router.use("/approvals", approvalRoutes);
router.use("/permissions", permissionRoutes);

export default router;

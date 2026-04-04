import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../shared/components/Layout/AppLayout";
import { AccessDeniedPage } from "../shared/components/AccessDeniedPage";
import { ROUTES } from "../shared/constants/routes";
import { ApprovalsPage } from "../features/approvals/pages/ApprovalsPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { ChangePasswordPage } from "../features/auth/pages/ChangePasswordPage";
import { AuditLogPage } from "../features/audit/pages/AuditLogPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { DocumentsPage } from "../features/documents/pages/DocumentsPage";
import { DocumentSearchPage } from "../features/documents/pages/DocumentSearchPage";
import { NotificationsPage } from "../features/notifications/pages/NotificationsPage";
import { ProfilePage } from "../features/settings/pages/ProfilePage";
import { ProjectDetailPage } from "../features/projects/pages/ProjectDetailPage";
import { ProjectFilesTab } from "../features/projects/pages/ProjectFilesTab";
import { ProjectListPage } from "../features/projects/pages/ProjectListPage";
import { ProjectMembersTab } from "../features/projects/pages/ProjectMembersTab";
import { ProjectOverviewTab } from "../features/projects/pages/ProjectOverviewTab";
import { ProjectSettingsPage } from "../features/projects/pages/ProjectSettingsPage";
import { ReportCreatePage } from "../features/reports/pages/ReportCreatePage";
import { ReportDetailPage } from "../features/reports/pages/ReportDetailPage";
import { ReportListPage } from "../features/reports/pages/ReportListPage";
import { SafetyDashboardPage } from "../features/safety/pages/SafetyDashboardPage";
import { SafetyReportPage } from "../features/safety/pages/SafetyReportPage";
import { QualityDashboardPage } from "../features/quality/pages/QualityDashboardPage";
import { QualityReportPage } from "../features/quality/pages/QualityReportPage";
import { WarehouseDashboardPage } from "../features/warehouse/pages/WarehouseDashboardPage";
import { WarehouseInventoryPage } from "../features/warehouse/pages/WarehouseInventoryPage";
import { WarehouseTransactionPage } from "../features/warehouse/pages/WarehouseTransactionPage";
import { BudgetOverviewPage } from "../features/budget/pages/BudgetOverviewPage";
import { BudgetApprovalPage } from "../features/budget/pages/BudgetApprovalPage";
import { TaskCreatePage } from "../features/tasks/pages/TaskCreatePage";
import { TaskDetailPage } from "../features/tasks/pages/TaskDetailPage";
import { TaskListPage } from "../features/tasks/pages/TaskListPage";
import { UserManagementPage } from "../features/users/pages/UserManagementPage";
import { PermissionGuard } from "./PermissionGuard";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPasswordPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "projects", element: <ProjectListPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      {
        path: "projects/:id",
        element: <ProjectDetailPage />,
        children: [
          { index: true, element: <ProjectOverviewTab /> },
          { path: "reports", element: <ReportListPage /> },
          { path: "reports/new", element: <ReportCreatePage /> },
          { path: "reports/:reportId", element: <ReportDetailPage /> },
          { path: "tasks", element: <TaskListPage /> },
          { path: "tasks/new", element: <TaskCreatePage /> },
          { path: "tasks/:taskId", element: <TaskDetailPage /> },
          { path: "members", element: <ProjectMembersTab /> },
          { path: "files", element: <ProjectFilesTab /> },
          { path: "documents", element: <DocumentsPage /> },
          {
            path: "safety",
            element: (
              <PermissionGuard toolId="SAFETY" minLevel="READ">
                <SafetyDashboardPage />
              </PermissionGuard>
            ),
          },
          {
            path: "safety/new",
            element: (
              <PermissionGuard toolId="SAFETY" minLevel="STANDARD">
                <SafetyReportPage />
              </PermissionGuard>
            ),
          },
          {
            path: "safety/:reportId",
            element: (
              <PermissionGuard toolId="SAFETY" minLevel="READ">
                <SafetyReportPage />
              </PermissionGuard>
            ),
          },
          {
            path: "quality",
            element: (
              <PermissionGuard toolId="QUALITY" minLevel="READ">
                <QualityDashboardPage />
              </PermissionGuard>
            ),
          },
          {
            path: "quality/new",
            element: (
              <PermissionGuard toolId="QUALITY" minLevel="STANDARD">
                <QualityReportPage />
              </PermissionGuard>
            ),
          },
          {
            path: "quality/:reportId",
            element: (
              <PermissionGuard toolId="QUALITY" minLevel="READ">
                <QualityReportPage />
              </PermissionGuard>
            ),
          },
          {
            path: "warehouse",
            element: (
              <PermissionGuard toolId="WAREHOUSE" minLevel="READ">
                <WarehouseDashboardPage />
              </PermissionGuard>
            ),
          },
          {
            path: "warehouse/inventory/:inventoryId",
            element: (
              <PermissionGuard toolId="WAREHOUSE" minLevel="READ">
                <WarehouseInventoryPage />
              </PermissionGuard>
            ),
          },
          {
            path: "warehouse/transactions/new",
            element: (
              <PermissionGuard toolId="WAREHOUSE" minLevel="READ">
                <WarehouseTransactionPage />
              </PermissionGuard>
            ),
          },
          {
            path: "budget",
            element: (
              <PermissionGuard toolId="BUDGET" minLevel="READ">
                <BudgetOverviewPage />
              </PermissionGuard>
            ),
          },
          {
            path: "budget/approvals",
            element: (
              <PermissionGuard toolId="BUDGET" minLevel="READ">
                <BudgetApprovalPage />
              </PermissionGuard>
            ),
          },
          {
            path: "settings",
            element: (
              <PermissionGuard toolId="PROJECT" minLevel="ADMIN">
                <ProjectSettingsPage />
              </PermissionGuard>
            ),
          },
        ],
      },
      { path: "documents/search", element: <DocumentSearchPage /> },
      {
        path: "users",
        element: (
          <PermissionGuard systemRoles={["ADMIN"]}>
            <UserManagementPage />
          </PermissionGuard>
        ),
      },
      {
        path: "approvals",
        element: (
          <PermissionGuard systemRoles={["ADMIN", "STAFF"]}>
            <ApprovalsPage />
          </PermissionGuard>
        ),
      },
      {
        path: "audit-logs",
        element: (
          <PermissionGuard systemRoles={["ADMIN"]}>
            <AuditLogPage />
          </PermissionGuard>
        ),
      },
      { path: "settings", element: <Navigate to={ROUTES.SETTINGS_PROFILE} replace /> },
      { path: "settings/profile", element: <ProfilePage /> },
      { path: "settings/change-password", element: <ChangePasswordPage /> },
      { path: "access-denied", element: <AccessDeniedPage /> },
    ],
  },
]);

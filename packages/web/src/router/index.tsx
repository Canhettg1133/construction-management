import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGuard } from "./RoleGuard";
import { AppLayout } from "../shared/components/Layout/AppLayout";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { ChangePasswordPage } from "../features/auth/pages/ChangePasswordPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ProjectListPage } from "../features/projects/pages/ProjectListPage";
import { ProjectDetailPage } from "../features/projects/pages/ProjectDetailPage";
import { ProjectOverviewTab } from "../features/projects/pages/ProjectOverviewTab";
import { ProjectMembersTab } from "../features/projects/pages/ProjectMembersTab";
import { ProjectFilesTab } from "../features/projects/pages/ProjectFilesTab";
import { ReportListPage } from "../features/reports/pages/ReportListPage";
import { ReportCreatePage } from "../features/reports/pages/ReportCreatePage";
import { ReportDetailPage } from "../features/reports/pages/ReportDetailPage";
import { TaskListPage } from "../features/tasks/pages/TaskListPage";
import { TaskCreatePage } from "../features/tasks/pages/TaskCreatePage";
import { TaskDetailPage } from "../features/tasks/pages/TaskDetailPage";
import { UserManagementPage } from "../features/users/pages/UserManagementPage";
import { AuditLogPage } from "../features/audit/pages/AuditLogPage";
import { ProfilePage } from "../features/settings/pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/forgot-password",
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
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "projects", element: <ProjectListPage /> },
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
        ],
      },
      {
        path: "users",
        element: (
          <RoleGuard roles={["ADMIN"]}>
            <UserManagementPage />
          </RoleGuard>
        ),
      },
      {
        path: "audit-logs",
        element: (
          <RoleGuard roles={["ADMIN", "PROJECT_MANAGER"]}>
            <AuditLogPage />
          </RoleGuard>
        ),
      },
      { path: "settings/profile", element: <ProfilePage /> },
      { path: "settings/change-password", element: <ChangePasswordPage /> },
    ],
  },
]);

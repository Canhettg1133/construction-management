import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FolderKanban,
  FileText,
  CheckSquare,
  Users,
  Files,
  ShieldAlert,
  ClipboardCheck,
  Warehouse,
  Wallet,
  Settings,
} from "lucide-react";
import { hasMinPermission, type PermissionLevel, type SystemRole, type ToolId } from "@construction/shared";
import { useAuthStore } from "../../../store/authStore";
import { useProjectPermissions } from "../../../shared/hooks/useProjectPermissions";
import { getProject } from "../api/projectApi";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";

interface Tab {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  systemRoles?: SystemRole[];
  toolId?: ToolId;
  minLevel?: PermissionLevel;
}

const primaryTabs: Tab[] = [
  { label: "Tổng quan", path: "", icon: FolderKanban, toolId: "PROJECT", minLevel: "READ" },
  { label: "Báo cáo ngày", path: "/reports", icon: FileText, toolId: "DAILY_REPORT", minLevel: "READ" },
  { label: "Công việc", path: "/tasks", icon: CheckSquare, toolId: "TASK", minLevel: "READ" },
  { label: "Tệp đính kèm", path: "/files", icon: Files, toolId: "FILE", minLevel: "READ" },
  { label: "Hồ sơ tài liệu", path: "/documents", icon: FileText, toolId: "DOCUMENT", minLevel: "READ" },
  { label: "An toàn", path: "/safety", icon: ShieldAlert, toolId: "SAFETY", minLevel: "READ" },
  { label: "Chất lượng", path: "/quality", icon: ClipboardCheck, toolId: "QUALITY", minLevel: "READ" },
  { label: "Kho vật tư", path: "/warehouse", icon: Warehouse, toolId: "WAREHOUSE", minLevel: "READ" },
  { label: "Ngân sách", path: "/budget", icon: Wallet, toolId: "BUDGET", minLevel: "READ" },
];

const managementTabs: Tab[] = [
  { label: "Thành viên", path: "/members", icon: Users, toolId: "PROJECT", minLevel: "READ" },
  { label: "Cài đặt dự án", path: "/settings", icon: Settings, toolId: "PROJECT", minLevel: "ADMIN" },
];

export function ProjectDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const normalizedSystemRole = user?.systemRole?.toUpperCase?.();
  const projectId = id ?? "";

  const { data: projectPermissions } = useProjectPermissions(projectId);

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={1} />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Không tải được thông tin dự án. Vui lòng thử lại." />;
  }

  const hasToolAccess = (tab: Tab) => {
    if (!tab.toolId) {
      return true;
    }

    if (!projectPermissions) {
      return true;
    }

    const userLevel = projectPermissions.toolPermissions[tab.toolId] ?? "NONE";
    return hasMinPermission(userLevel, tab.minLevel ?? "READ");
  };

  const canViewTab = (tab: Tab) =>
    (!tab.systemRoles || (normalizedSystemRole && tab.systemRoles.includes(normalizedSystemRole as SystemRole))) &&
    hasToolAccess(tab);

  const visiblePrimaryTabs = primaryTabs.filter(canViewTab);
  const visibleManagementTabs = managementTabs.filter(canViewTab);

  const isTabActive = (path: string) =>
    path === ""
      ? location.pathname === `/projects/${projectId}`
      : location.pathname.startsWith(`/projects/${projectId}${path}`);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/projects"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            {"<-"} Dự án
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold text-slate-900">{project?.name}</h1>
            <p className="page-subtitle">{project?.location}</p>
          </div>
        </div>

        {visibleManagementTabs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {visibleManagementTabs.map((tab) => {
              const Icon = tab.icon;
              const fullPath = `/projects/${projectId}${tab.path}`;
              const isActive = isTabActive(tab.path);

              return (
                <Link
                  key={tab.path}
                  to={fullPath}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {visiblePrimaryTabs.map((tab) => {
            const Icon = tab.icon;
            const fullPath = `/projects/${projectId}${tab.path}`;
            const isActive = isTabActive(tab.path);

            return (
              <Link
                key={tab.path}
                to={fullPath}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <Outlet />
    </div>
  );
}

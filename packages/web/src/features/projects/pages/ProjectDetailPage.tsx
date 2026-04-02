import { Link, useParams, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { getProject } from "../api/projectApi";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { FolderKanban, FileText, CheckSquare, Users, Files } from "lucide-react";

interface Tab {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const tabs: Tab[] = [
  { label: "Tổng quan", path: "", icon: FolderKanban },
  { label: "Báo cáo ngày", path: "/reports", icon: FileText },
  { label: "Task", path: "/tasks", icon: CheckSquare },
  { label: "Thành viên", path: "/members", icon: Users },
  { label: "Files", path: "/files", icon: Files },
];

export function ProjectDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const normalizedRole = user?.role?.toUpperCase?.();

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(String(id)),
    enabled: !!id,
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

  const visibleTabs = tabs.filter((tab) => !tab.roles || (normalizedRole && tab.roles.includes(normalizedRole)));

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/projects"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          ← Dự án
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-slate-900">{project?.name}</h1>
          <p className="page-subtitle">{project?.location}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <div className="flex min-w-max gap-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const fullPath = `/projects/${id}${tab.path}`;
            const isActive =
              tab.path === ""
                ? location.pathname === `/projects/${id}`
                : location.pathname.startsWith(`/projects/${id}${tab.path}`);

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

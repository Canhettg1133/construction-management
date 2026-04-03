import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/authStore";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { getDashboardStats } from "../api/dashboardApi";
import { TASK_STATUS_LABELS, AUDIT_ACTION_LABELS } from "@construction/shared";
import type { TaskStatus } from "@construction/shared";
import {
  FolderKanban, CheckSquare, FileText, Users, AlertTriangle, Bell, CheckCircle, TrendingUp
} from "lucide-react";
import { OverdueTasksWidget } from "../components/OverdueTasksWidget";
import { RiskyProjectsWidget } from "../components/RiskyProjectsWidget";
import { ActiveMembersWidget } from "../components/ActiveMembersWidget";
import { WeeklyProgressChart } from "../components/WeeklyProgressChart";

export function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: getDashboardStats,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
        <SkeletonCard lines={3} />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="Không thể tải dữ liệu dashboard. Vui lòng thử lại sau." />;
  }

  const stats = [
    { label: "Dự án", value: String(data.projectCount), tone: "bg-brand-500", icon: FolderKanban },
    { label: "Task đang mở", value: String(data.openTaskCount), tone: "bg-amber-500", icon: CheckSquare },
    { label: "Task quá hạn", value: String(data.overdueTaskCount), tone: "bg-red-500", icon: AlertTriangle },
    { label: "Báo cáo hôm nay", value: String(data.todayReportCount), tone: "bg-emerald-500", icon: FileText },
  ];

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Tổng quan tiến độ và hoạt động công trường theo dữ liệu realtime.</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.systemRole === "ADMIN" ? (
            data.pendingApprovals.taskCount + data.pendingApprovals.reportCount > 0 ? (
              <div className="relative rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 animate-pulse text-red-500" />
                  <span className="font-medium text-red-700">
                    {data.pendingApprovals.taskCount + data.pendingApprovals.reportCount} cần duyệt
                  </span>
                </div>
                <div className="mt-1 flex gap-2 text-red-500">
                  {data.pendingApprovals.taskCount > 0 && (
                    <span>{data.pendingApprovals.taskCount} task</span>
                  )}
                  {data.pendingApprovals.taskCount > 0 && data.pendingApprovals.reportCount > 0 && (
                    <span>·</span>
                  )}
                  {data.pendingApprovals.reportCount > 0 && (
                    <span>{data.pendingApprovals.reportCount} báo cáo</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-medium text-emerald-700">Đã duyệt hết</span>
                </div>
              </div>
            )
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            Vai trò hệ thống: <span className="font-semibold text-slate-800">{user?.systemRole ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="app-card transition-transform duration-200 hover:-translate-y-0.5">
              <div className="mb-3 flex items-center gap-2">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${stat.tone}/10`}>
                  <Icon className={`h-4 w-4 ${stat.tone.replace("bg-", "text-")}`} />
                </div>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
              <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Task status breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="app-card">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Trạng thái Task</h3>
          </div>
          <div className="space-y-2.5">
            {(Object.entries(data.tasksByStatus) as [TaskStatus, number][]).map(([status, count]) => {
              const total = Object.values(data.tasksByStatus).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              const colors: Record<TaskStatus, string> = {
                TO_DO: "bg-slate-400",
                IN_PROGRESS: "bg-brand-500",
                DONE: "bg-emerald-500",
                CANCELLED: "bg-red-400",
              };
              return (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-xs text-slate-600">
                    <span>{TASK_STATUS_LABELS[status]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${colors[status]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="app-card">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Nhân sự</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Nhân sự tham gia</span>
              <span className="text-lg font-bold text-slate-900">{data.memberCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Dự án đang hoạt động</span>
              <span className="text-lg font-bold text-brand-600">{data.activeProjectCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Dự án quá hạn</span>
              <span className="text-lg font-bold text-red-600">{data.overdueTaskCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module 4: Widgets mới */}
      {data.weeklyProgress.length > 0 && (
        <WeeklyProgressChart data={data.weeklyProgress} />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OverdueTasksWidget tasks={data.overdueTasks} />
        <RiskyProjectsWidget projects={data.riskyProjects} />
        <ActiveMembersWidget members={data.activeMembers} />
      </div>

      <div className="app-card">
        <div className="mb-2 flex items-center justify-between">
          <h3>Hoạt động gần đây</h3>
          <span className="text-xs text-slate-500">Cập nhật: {new Date(data.updatedAt).toLocaleTimeString("vi-VN")}</span>
        </div>
        <div className="mt-3 space-y-2">
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có hoạt động gần đây.</p>
          ) : (
            data.recentActivity.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100">
                <span className="font-medium text-slate-900">{AUDIT_ACTION_LABELS[item.action] ?? item.action}</span> · {item.description}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

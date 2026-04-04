import { TrendingUp, Users, ShieldCheck } from "lucide-react";
import { TASK_STATUS_LABELS } from "@construction/shared";
import type { TaskStatus } from "@construction/shared";
import { useAuthStore } from "../../../store/authStore";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { ActiveMembersWidget } from "../components/ActiveMembersWidget";
import { WeeklyProgressChart } from "../components/WeeklyProgressChart";
import { DashboardSkeleton } from "../components/common/DashboardSkeleton";
import { PendingBadge } from "../components/common/PendingBadge";
import { StatsCardGrid } from "../components/common/StatsCardGrid";
import { OverdueTasksWidget } from "../components/overdue/OverdueTasksWidget";
import { RecentActivity } from "../components/recent/RecentActivity";
import { RiskyProjectsWidget } from "../components/risky/RiskyProjectsWidget";
import { ClientStatsWidget } from "../components/widgets/ClientStatsWidget";
import { LowStockAlertsWidget } from "../components/widgets/LowStockAlertsWidget";
import { MyReportsWidget } from "../components/widgets/MyReportsWidget";
import { MyTasksWidget } from "../components/widgets/MyTasksWidget";
import { PendingSafetyApprovalsWidget } from "../components/widgets/PendingSafetyApprovalsWidget";
import { PendingTransactionsWidget } from "../components/widgets/PendingTransactionsWidget";
import { QualityReportsWidget } from "../components/widgets/QualityReportsWidget";
import { QualityStatsWidget } from "../components/widgets/QualityStatsWidget";
import { RecentTransactionsWidget } from "../components/widgets/RecentTransactionsWidget";
import { SafetyStatsWidget } from "../components/widgets/SafetyStatsWidget";
import { SafetyViolationsWidget } from "../components/widgets/SafetyViolationsWidget";
import { WarehouseOverviewWidget } from "../components/widgets/WarehouseOverviewWidget";
import { WarehouseStatsWidget } from "../components/widgets/WarehouseStatsWidget";
import { WarehouseTrendChart } from "../components/widgets/WarehouseTrendChart";
import { useDashboard } from "../hooks/useDashboard";
import { useDashboardRole } from "../hooks/useDashboardRole";

const STATUS_COLORS: Record<TaskStatus, string> = {
  TO_DO: "bg-slate-400",
  IN_PROGRESS: "bg-brand-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

function TaskStatusBreakdown({ tasksByStatus }: { tasksByStatus: Record<TaskStatus, number> }) {
  const total = Object.values(tasksByStatus).reduce((sum, value) => sum + value, 0);

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Trang thai task</h3>
      </div>
      <div className="space-y-2.5">
        {(Object.entries(tasksByStatus) as [TaskStatus, number][]).map(([status, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={status}>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>{TASK_STATUS_LABELS[status]}</span>
                <span className="font-medium">{count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${STATUS_COLORS[status]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamOverview({
  memberCount,
  activeProjectCount,
  overdueTaskCount,
}: {
  memberCount: number;
  activeProjectCount: number;
  overdueTaskCount: number;
}) {
  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">Nhan su</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Nhan su tham gia</span>
          <span className="text-lg font-bold text-slate-900">{memberCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Du an dang hoat dong</span>
          <span className="text-lg font-bold text-brand-600">{activeProjectCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Task qua han</span>
          <span className="text-lg font-bold text-red-600">{overdueTaskCount}</span>
        </div>
      </div>
    </div>
  );
}

function GenericSummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const role = useDashboardRole();
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return <ErrorState message="Khong the tai du lieu dashboard. Vui long thu lai sau." />;
  }

  return (
    <div className="space-y-5 page-enter">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Tong quan tien do va hoat dong theo role cua ban.</p>
        </div>
        <div className="flex items-center gap-3">
          <PendingBadge />
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
            Vai tro he thong: <span className="font-semibold text-slate-800">{user?.systemRole ?? "-"}</span>
          </div>
        </div>
      </div>

      <StatsCardGrid />

      <div className="grid gap-4 xl:grid-cols-3">
        <SafetyStatsWidget />
        <QualityStatsWidget />
        <WarehouseStatsWidget />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {role.showTaskStats ? (
          <TaskStatusBreakdown tasksByStatus={data.myTasksByStatus ?? data.tasksByStatus} />
        ) : (
          <GenericSummaryCard
            title="Tien do chung"
            value={`${Math.round(data.weeklyProgress.reduce((sum, item) => sum + item.completedTasks, 0))}`}
            description="Tong so dau muc hoan thanh trong 7 ngay."
          />
        )}

        {role.isWarehouse ? (
          <WarehouseTrendChart />
        ) : data.weeklyProgress.length > 0 ? (
          <WeeklyProgressChart data={data.weeklyProgress} />
        ) : (
          <TeamOverview
            memberCount={data.memberCount}
            activeProjectCount={data.activeProjectCount}
            overdueTaskCount={data.overdueTaskCount}
          />
        )}
      </div>

      {(role.isAdmin || role.isPM || role.isQuality) && !role.isWarehouse ? (
        <WarehouseTrendChart />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OverdueTasksWidget />
        <RiskyProjectsWidget />
        {(role.isAdmin || role.isPM) && <ActiveMembersWidget members={data.activeMembers} />}

        <MyTasksWidget />
        <MyReportsWidget />

        <SafetyViolationsWidget />
        <PendingSafetyApprovalsWidget />

        <QualityReportsWidget />
        <WarehouseOverviewWidget />

        <LowStockAlertsWidget />
        <PendingTransactionsWidget />
        <RecentTransactionsWidget />

        <ClientStatsWidget />
      </div>

      <RecentActivity />
    </div>
  );
}

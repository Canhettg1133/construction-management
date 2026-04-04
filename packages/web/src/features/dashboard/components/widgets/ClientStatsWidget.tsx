import { BriefcaseBusiness, CircleDollarSign } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";
import { formatCurrency } from "./utils";

export function ClientStatsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isClient) {
    return null;
  }

  const projectProgress = data?.projectProgress ?? [];
  const budgetOverview = data?.budgetOverview ?? [];

  return (
    <div className="space-y-4 xl:col-span-3">
      <div className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <BriefcaseBusiness className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-700">Tien do du an</h3>
        </div>

        {projectProgress.length === 0 ? (
          <p className="py-5 text-center text-sm text-slate-500">Chua co du an nao trong pham vi theo doi.</p>
        ) : (
          <div className="space-y-3">
            {projectProgress.map((project) => (
              <div key={project.projectId} className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{project.projectName}</span>
                  <span className="text-slate-500">{project.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>Con {project.daysRemaining} ngay</span>
                  <span>Hoan thanh {project.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">Ngan sach</h3>
        </div>

        {budgetOverview.length === 0 ? (
          <p className="py-5 text-center text-sm text-slate-500">Chua co du lieu ngan sach.</p>
        ) : (
          <div className="space-y-3">
            {budgetOverview.map((budget) => (
              <div key={budget.projectId} className="rounded-xl border border-slate-200 p-3">
                <p className="truncate text-sm font-medium text-slate-900">{budget.projectName}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>Du toan: {formatCurrency(budget.totalEstimated)}</p>
                  <p>Da duyet: {formatCurrency(budget.totalApproved)}</p>
                  <p>Da chi: {formatCurrency(budget.totalSpent)}</p>
                  <p className={budget.remaining < 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                    Con lai: {formatCurrency(budget.remaining)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


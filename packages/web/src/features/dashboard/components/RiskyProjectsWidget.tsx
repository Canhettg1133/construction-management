import { ShieldAlert } from "lucide-react";
import type { DashboardRiskyProject } from "@construction/shared";

interface RiskyProjectsWidgetProps {
  projects: DashboardRiskyProject[];
}

export function RiskyProjectsWidget({ projects }: RiskyProjectsWidgetProps) {
  const rateColor = (rate: number) => {
    if (rate >= 50) return "bg-red-500";
    if (rate >= 30) return "bg-amber-500";
    return "bg-yellow-400";
  };

  if (projects.length === 0) {
    return (
      <div className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Dự án rủi ro</h3>
        </div>
        <p className="py-4 text-center text-sm text-slate-500">Tất cả dự án đang an toàn.</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-700">Dự án rủi ro</h3>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <div key={project.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium text-slate-800">{project.name}</p>
              <span className="shrink-0 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                {project.overdueTasks}/{project.totalTasks}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${rateColor(project.overdueRate)}`}
                style={{ width: `${Math.min(project.overdueRate, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Task overdue</span>
              <span className="font-semibold text-red-600">{project.overdueRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

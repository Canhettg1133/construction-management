import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { TASK_PRIORITY_LABELS } from "@construction/shared";
import type { DashboardOverdueTask } from "@construction/shared";

interface OverdueTasksWidgetProps {
  tasks: DashboardOverdueTask[];
}

export function OverdueTasksWidget({ tasks }: OverdueTasksWidgetProps) {
  const navigate = useNavigate();

  const priorityColors: Record<string, string> = {
    HIGH: "text-red-600 bg-red-50",
    MEDIUM: "text-amber-600 bg-amber-50",
    LOW: "text-slate-600 bg-slate-50",
  };

  if (tasks.length === 0) {
    return (
      <div className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Task quá hạn</h3>
        </div>
        <p className="py-4 text-center text-sm text-slate-500">Không có task quá hạn nào.</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-700">Task quá hạn</h3>
        </div>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
          {tasks.length}
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => navigate(`/projects/${task.projectId}/tasks`)}
            className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-sm transition-all hover:border-red-200 hover:bg-red-50/30"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-medium text-slate-900 group-hover:text-red-700">
                {task.title}
              </p>
              <p className="truncate text-xs text-slate-500">{task.projectName}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  priorityColors[task.priority] ?? "text-slate-600 bg-slate-50"
                }`}
              >
                {TASK_PRIORITY_LABELS[task.priority]}
              </span>
              <div className="flex items-center gap-1 text-xs text-red-500">
                <span className="font-semibold">{task.daysOverdue}d</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

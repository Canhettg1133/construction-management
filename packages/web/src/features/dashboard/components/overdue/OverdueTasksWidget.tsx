import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import { TASK_PRIORITY_LABELS } from "@construction/shared";
import type { DashboardOverdueTask, Task } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

type TaskWithProject = Task & { project?: { id: string; name: string } };

interface OverdueItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: string;
  daysOverdue: number;
}

const OPEN_STATUSES = new Set(["TO_DO", "IN_PROGRESS"]);

function toOverdueItem(task: TaskWithProject): OverdueItem | null {
  if (!task.dueDate) return null;
  if (!OPEN_STATUSES.has(task.status)) return null;
  const dueTime = new Date(task.dueDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(dueTime) || dueTime >= now) return null;

  const daysOverdue = Math.max(0, Math.floor((now - dueTime) / 86400000));
  return {
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    projectName: task.project?.name ?? "Du an",
    priority: task.priority,
    daysOverdue,
  };
}

function fromDashboardTask(task: DashboardOverdueTask): OverdueItem {
  return {
    id: task.id,
    title: task.title,
    projectId: task.projectId,
    projectName: task.projectName,
    priority: task.priority,
    daysOverdue: task.daysOverdue,
  };
}

export function OverdueTasksWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();
  const navigate = useNavigate();

  if (!role.showOverdueTasks) {
    return null;
  }

  let title = "Task qua han";
  let tasks: OverdueItem[] = [];

  if (role.isAdmin || role.isPM) {
    title = "Task qua han";
    tasks = (data?.overdueTasks ?? []).map(fromDashboardTask);
  } else if (role.isSafety) {
    title = "Task an toan qua han";
    tasks = (data?.safetyTasks ?? []).map((task) => toOverdueItem(task as TaskWithProject)).filter(Boolean) as OverdueItem[];
  } else if (role.isEngineer) {
    title = "Task cua toi qua han";
    tasks = (data?.myTasks ?? []).map((task) => toOverdueItem(task as TaskWithProject)).filter(Boolean) as OverdueItem[];
  } else if (role.isQuality) {
    title = "Task QC qua han";
    tasks = (data?.overdueTasks ?? []).map(fromDashboardTask);
  }

  if (tasks.length === 0) {
    return (
      <div className="app-card">
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        <p className="py-4 text-center text-sm text-slate-500">Khong co task qua han nao.</p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
          {tasks.length}
        </span>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => navigate(`/projects/${task.projectId}/tasks`)}
            className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-left text-sm transition-all hover:border-red-200 hover:bg-red-50/30"
            type="button"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-medium text-slate-900 group-hover:text-red-700">{task.title}</p>
              <p className="truncate text-xs text-slate-500">{task.projectName}</p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">
                {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
              </span>
              <div className="flex items-center gap-1 text-xs text-red-500">
                <span className="font-semibold">{task.daysOverdue}d</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


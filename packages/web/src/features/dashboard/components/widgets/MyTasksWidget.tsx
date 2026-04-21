import { Link } from "react-router-dom";
import { CheckSquare, Clock3 } from "lucide-react";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@construction/shared";
import type { Task } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

type TaskWithProject = Task & { project?: { id: string; name: string } };

const OPEN_STATUSES = new Set(["TO_DO", "IN_PROGRESS"]);

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (!OPEN_STATUSES.has(task.status)) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export function MyTasksWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isEngineer) {
    return null;
  }

  const tasks = (data?.myTasks ?? []) as TaskWithProject[];

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-700">Công việc của tôi</h3>
        </div>
        <span className="text-xs text-slate-500">{tasks.length} công việc</span>
      </div>

      {tasks.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">Bạn chưa có công việc được giao.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {tasks.slice(0, 8).map((task) => (
            <div key={task.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{task.project?.name ?? "Dự án"}</p>
                </div>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">{TASK_STATUS_LABELS[task.status] ?? task.status}</span>
                {task.dueDate ? (
                  <span className={isOverdue(task) ? "font-semibold text-red-600" : "text-slate-500"}>
                    <Clock3 className="mr-1 inline h-3 w-3" />
                    {new Date(task.dueDate).toLocaleDateString("vi-VN")}
                  </span>
                ) : (
                  <span className="text-slate-400">Không có hạn</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks[0]?.projectId ? (
        <div className="mt-3 border-t border-slate-100 pt-3 text-right">
          <Link
            to={`/projects/${tasks[0].projectId}/tasks`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Xem danh sách công việc
          </Link>
        </div>
      ) : null}
    </div>
  );
}

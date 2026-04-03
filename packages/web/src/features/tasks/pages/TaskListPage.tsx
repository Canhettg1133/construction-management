import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X, Filter, CheckSquare, AlertCircle, Clock, Ban } from "lucide-react";
import { listTasks } from "../api/taskApi";
import { listProjectMembers } from "../../projects/api/memberApi";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { usePermission } from "../../../shared/hooks/usePermission";
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from "@construction/shared";
import type { Task, TaskStatus, TaskPriority } from "@construction/shared";

const STATUS_FILTER_OPTIONS: Array<{ value: TaskStatus | ""; label: string; icon: React.ElementType }> = [
  { value: "", label: "Tất cả", icon: Filter },
  { value: "TO_DO", label: "Chưa làm", icon: CheckSquare },
  { value: "IN_PROGRESS", label: "Đang làm", icon: AlertCircle },
  { value: "DONE", label: "Hoàn thành", icon: Clock },
  { value: "CANCELLED", label: "Hủy", icon: Ban },
];

const PRIORITY_OPTIONS: Array<{ value: TaskPriority | ""; label: string }> = [
  { value: "", label: "Tất cả ưu tiên" },
  { value: "HIGH", label: "Cao" },
  { value: "MEDIUM", label: "Trung bình" },
  { value: "LOW", label: "Thấp" },
];

function TaskCard({ task, projectId }: { task: Task; projectId: string }) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE" &&
    task.status !== "CANCELLED";

  const priorityColor: Record<TaskPriority, string> = {
    HIGH: "bg-red-50 text-red-700",
    MEDIUM: "bg-amber-50 text-amber-700",
    LOW: "bg-slate-100 text-slate-600",
  };

  const statusColor: Record<TaskStatus, string> = {
    TO_DO: "bg-slate-100 text-slate-600",
    IN_PROGRESS: "bg-brand-50 text-brand-700",
    DONE: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-600",
  };

  return (
    <Link
      to={`/projects/${projectId}/tasks/${task.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{task.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[task.status]}`}>
              {TASK_STATUS_LABELS[task.status]}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[task.priority]}`}>
              {TASK_PRIORITY_LABELS[task.priority]}
            </span>
          </div>
          {task.assignee && (
            <p className="mt-1 text-xs text-slate-400">{task.assignee.name}</p>
          )}
        </div>
        {task.dueDate && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
              isOverdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
            }`}
          >
            {new Date(task.dueDate).toLocaleDateString("vi-VN")}
          </span>
        )}
      </div>
      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-500">{task.description}</p>
      )}
    </Link>
  );
}

export function TaskListPage() {
  const { id: projectId } = useParams();
  const currentProjectId = projectId ?? "";
  const { has: canCreateTask } = usePermission({
    projectId: currentProjectId,
    toolId: "TASK",
    minLevel: "STANDARD",
  });

  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [deadlineFrom, setDeadlineFrom] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { data: membersData } = useQuery({
    queryKey: ["project-members", currentProjectId],
    queryFn: () => listProjectMembers(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasks", currentProjectId, statusFilter, priorityFilter, assigneeFilter, deadlineFrom, deadlineTo],
    queryFn: () =>
      listTasks(currentProjectId, {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        assigned_to: assigneeFilter || undefined,
        from: deadlineFrom || undefined,
        to: deadlineTo || undefined,
      }),
    enabled: Boolean(currentProjectId),
  });

  const tasks = data?.tasks ?? [];
  const members = membersData ?? [];
  const hasActiveFilters = statusFilter || priorityFilter || assigneeFilter || deadlineFrom || deadlineTo;

  const clearFilters = () => {
    setStatusFilter("");
    setPriorityFilter("");
    setAssigneeFilter("");
    setDeadlineFrom("");
    setDeadlineTo("");
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>Task</h2>
          <p className="page-subtitle">Theo dõi công việc theo từng hạng mục và deadline.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition sm:px-4 ${
              showFilters || hasActiveFilters
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Lọc</span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
                {Number(!!statusFilter) + Number(!!priorityFilter) + Number(!!assigneeFilter) + Number(!!deadlineFrom) + Number(!!deadlineTo)}
              </span>
            )}
          </button>
          <PermissionGate projectId={currentProjectId} toolId="TASK" minLevel="STANDARD">
            <Link
              to={`/projects/${currentProjectId}/tasks/new`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Tạo task
            </Link>
          </PermissionGate>
        </div>
      </div>

      {showFilters && (
        <div className="app-card animate-in slide-in-from-top-2 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Filter className="h-4 w-4" />
            Bộ lọc
          </div>

          {/* Status quick filter */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Trạng thái</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTER_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      statusFilter === opt.value
                        ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="form-label text-xs">Ưu tiên</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")}
                className="form-input"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label text-xs">Người phụ trách</label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="form-input"
              >
                <option value="">Tất cả</option>
                {members.map((m) =>
                  m.user ? (
                    <option key={m.id} value={m.userId}>{m.user.name}</option>
                  ) : null
                )}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="form-label text-xs">Từ deadline</label>
                <input
                  type="date"
                  value={deadlineFrom}
                  onChange={(e) => setDeadlineFrom(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="flex-1">
                <label className="form-label text-xs">Đến deadline</label>
                <input
                  type="date"
                  value={deadlineTo}
                  onChange={(e) => setDeadlineTo(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      )}

      {isError && <ErrorState message="Không tải được task. Vui lòng thử lại sau vài giây." />}

      {!isLoading && !isError && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <EmptyState
              title={hasActiveFilters ? "Không có task phù hợp" : "Chưa có task nào"}
              description={
                hasActiveFilters
                  ? "Thử thay đổi bộ lọc tìm kiếm."
                  : canCreateTask
                  ? "Bắt đầu bằng cách tạo task đầu tiên cho dự án."
                  : "Hiện chưa có task được giao."
              }
            />
          ) : (
            <>
              {hasActiveFilters && (
                <p className="text-xs text-slate-500">{tasks.length} task phù hợp với bộ lọc</p>
              )}
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} projectId={currentProjectId} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

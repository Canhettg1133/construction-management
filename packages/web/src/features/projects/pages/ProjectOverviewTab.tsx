import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FolderKanban, MapPin, Users, CheckSquare, FileText,
  ChevronRight, Edit2, X, AlertCircle, Clock
} from "lucide-react";
import { getProject, updateProject } from "../api/projectApi";
import { listProjectMembers } from "../api/memberApi";
import { listReports } from "../../reports/api/reportApi";
import { listTasks } from "../../tasks/api/taskApi";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";
import { useAuthStore } from "../../../store/authStore";
import { PROJECT_STATUS_LABELS } from "@construction/shared";
import type { ProjectStatus } from "@construction/shared";

const PROJECT_STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  location: z.string().min(1).max(500).optional(),
  clientName: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED"]).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
});

type UpdateProjectForm = z.infer<typeof updateProjectSchema>;

interface EditProjectModalProps {
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>;
  onClose: () => void;
  onSuccess: () => void;
}

function EditProjectModal({ project, onClose, onSuccess }: EditProjectModalProps) {
  const showToast = useUiStore((s) => s.showToast);
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateProjectForm>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description ?? "",
      location: project.location,
      clientName: project.clientName ?? "",
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      endDate: project.endDate ? project.endDate.slice(0, 10) : "",
      status: project.status,
      progress: project.progress,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: UpdateProjectForm) => updateProject(project.id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["project", project.id], updated);
      showToast({ type: "success", title: "Cập nhật dự án thành công" });
      onSuccess();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Cập nhật thất bại";
      showToast({ type: "error", title: "Lỗi", description: msg });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Chỉnh sửa dự án</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit((data) => mutation.mutateAsync(data))} className="space-y-4 p-5">
          <div>
            <label className="form-label">Tên dự án</label>
            <input {...register("name")} className="form-input" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Mô tả</label>
            <textarea {...register("description")} rows={3} className="form-input" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Địa điểm</label>
              <input {...register("location")} className="form-input" />
              {errors.location && <p className="form-error">{errors.location.message}</p>}
            </div>
            <div>
              <label className="form-label">Khách hàng</label>
              <input {...register("clientName")} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Ngày bắt đầu</label>
              <input {...register("startDate")} type="date" className="form-input" />
            </div>
            <div>
              <label className="form-label">Ngày kết thúc (dự kiến)</label>
              <input {...register("endDate")} type="date" className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Trạng thái</label>
              <select {...register("status")} className="form-input">
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Tiến độ (%)</label>
              <input {...register("progress")} type="number" min={0} max={100} className="form-input" />
            </div>
          </div>
          {errors.root && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {errors.root.message}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
            <Button type="submit" isLoading={mutation.isPending}>Lưu thay đổi</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectOverviewTab() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: project, isLoading, isError } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(String(id)),
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => listProjectMembers(String(id)),
    enabled: !!id,
  });

  const { data: reportsData } = useQuery({
    queryKey: ["reports", id],
    queryFn: () => listReports(String(id)),
    enabled: !!id,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => listTasks(String(id)),
    enabled: !!id,
  });

  const [showEdit, setShowEdit] = useState(false);
  const normalizedRole = user?.role?.toUpperCase?.();
  const canEdit = normalizedRole === "ADMIN" || normalizedRole === "PROJECT_MANAGER";

  const recentReports = reportsData?.reports?.slice(0, 3) ?? [];
  const openTasks = tasksData?.tasks?.filter((t: { status: string }) => t.status !== "DONE" && t.status !== "CANCELLED") ?? [];
  const overdueTasks = openTasks.filter((t: { dueDate?: string | null }) => t.dueDate && new Date(t.dueDate) < new Date());

  const progressColor = project && project.progress >= 80 ? "bg-emerald-500" :
    project && project.progress >= 40 ? "bg-brand-500" : "bg-amber-500";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError || !project) {
    return <ErrorState message="Không tải được thông tin dự án." />;
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Edit2 className="h-4 w-4" />
            Chỉnh sửa
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="app-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Tiến độ dự án</h3>
          <span className="text-2xl font-bold text-brand-600">{project.progress}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">{PROJECT_STATUS_LABELS[project.status]}</span>
          <span>Cập nhật: {new Date(project.updatedAt).toLocaleDateString("vi-VN")}</span>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="app-card">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <FolderKanban className="h-4 w-4 text-slate-400" />
            Thông tin dự án
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-slate-500 w-20 shrink-0">Mã:</span>
              <span className="font-medium text-slate-800">{project.code}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-slate-500 w-20 shrink-0">Khách hàng:</span>
              <span className="text-slate-800">{project.clientName || "—"}</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-slate-500 w-20 shrink-0">Ngày bắt đầu:</span>
              <span className="text-slate-800">{new Date(project.startDate).toLocaleDateString("vi-VN")}</span>
            </div>
            {project.endDate && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-slate-500 w-20 shrink-0">Ngày KT:</span>
                <span className="text-slate-800">{new Date(project.endDate).toLocaleDateString("vi-VN")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="app-card">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <MapPin className="h-4 w-4 text-slate-400" />
            Địa điểm
          </div>
          <p className="mt-3 text-sm text-slate-700">{project.location}</p>
          {project.description && (
            <p className="mt-2 text-xs text-slate-500">{project.description}</p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => navigate(`/projects/${id}/members`)}
          className="app-card flex items-center gap-3 text-left transition hover:-translate-y-0.5"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50">
            <Users className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Thành viên</p>
            <p className="text-xl font-bold text-slate-900">{members?.length ?? 0}</p>
          </div>
        </button>
        <button
          onClick={() => navigate(`/projects/${id}/reports`)}
          className="app-card flex items-center gap-3 text-left transition hover:-translate-y-0.5"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50">
            <FileText className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Báo cáo</p>
            <p className="text-xl font-bold text-slate-900">{reportsData?.reports?.length ?? 0}</p>
          </div>
        </button>
        <button
          onClick={() => navigate(`/projects/${id}/tasks`)}
          className="app-card flex items-center gap-3 text-left transition hover:-translate-y-0.5"
        >
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50">
            <CheckSquare className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Task mở</p>
            <p className="text-xl font-bold text-slate-900">{openTasks.length}</p>
          </div>
        </button>
        {overdueTasks.length > 0 && (
          <button
            onClick={() => navigate(`/projects/${id}/tasks`)}
            className="app-card flex items-center gap-3 text-left transition hover:-translate-y-0.5"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-50">
              <Clock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Quá hạn</p>
              <p className="text-xl font-bold text-red-600">{overdueTasks.length}</p>
            </div>
          </button>
        )}
      </div>

      {/* Recent activity */}
      {recentReports.length > 0 && (
        <div className="app-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Báo cáo gần đây</h3>
            <button
              onClick={() => navigate(`/projects/${id}/reports`)}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
            >
              Xem tất cả <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentReports.map((report) => (
              <Link
                key={report.id}
                to={`/projects/${id}/reports/${report.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm transition hover:bg-slate-100"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {new Date(report.reportDate).toLocaleDateString("vi-VN", {
                      weekday: "short", day: "numeric", month: "short",
                    })}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{report.workDescription}</p>
                </div>
                <span className="ml-3 shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                  {report.progress}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); }}
        />
      )}
    </div>
  );
}

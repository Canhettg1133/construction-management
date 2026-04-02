import { Link } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ROUTES } from "../../../shared/constants/routes";
import { useAuthStore } from "../../../store/authStore";
import { listProjects, createProject } from "../api/projectApi";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";
import { X } from "lucide-react";
import type { Project, ProjectStatus } from "@construction/shared";

const createProjectSchema = z.object({
  code: z.string().min(1, "Mã dự án không được để trống").max(50).regex(/^[a-zA-Z0-9-]+$/, "Chỉ chứa chữ, số và dấu gạch ngang"),
  name: z.string().min(1, "Tên dự án không được để trống").max(200),
  description: z.string().max(5000).optional(),
  location: z.string().min(1, "Địa điểm không được để trống").max(500),
  clientName: z.string().max(200).optional(),
  startDate: z.string().min(1, "Ngày bắt đầu không được để trống"),
  endDate: z.string().optional(),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

function CreateProjectModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (p: Project) => void }) {
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      location: "",
      clientName: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CreateProjectForm) => createProject({ ...data, status: "ACTIVE" as ProjectStatus }),
    onSuccess: (project) => {
      queryClient.setQueryData<{ projects: Project[]; meta?: unknown }>(["projects"], (old) => ({
        projects: [project, ...(old?.projects ?? [])],
        meta: old?.meta,
      }));
      showToast({ type: "success", title: "Tạo dự án thành công", description: `Dự án "${project.name}" đã được tạo.` });
      onSuccess(project);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Tạo dự án thất bại";
      setServerError(msg);
      showToast({ type: "error", title: "Tạo dự án thất bại", description: msg });
    },
  });

  const onSubmit = (data: CreateProjectForm) => {
    setServerError("");
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Tạo dự án mới</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {serverError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Mã dự án <span className="text-red-500">*</span></label>
              <input {...register("code")} className="form-input" placeholder="PROJ-001" />
              {errors.code && <p className="form-error">{errors.code.message}</p>}
            </div>
            <div>
              <label className="form-label">Ngày bắt đầu <span className="text-red-500">*</span></label>
              <input {...register("startDate")} type="date" className="form-input" />
              {errors.startDate && <p className="form-error">{errors.startDate.message}</p>}
            </div>
          </div>

          <div>
            <label className="form-label">Tên dự án <span className="text-red-500">*</span></label>
            <input {...register("name")} className="form-input" placeholder="Công trình A" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="form-label">Địa điểm <span className="text-red-500">*</span></label>
            <input {...register("location")} className="form-input" placeholder="123 Đường ABC, Quận 1, TP.HCM" />
            {errors.location && <p className="form-error">{errors.location.message}</p>}
          </div>

          <div>
            <label className="form-label">Tên khách hàng</label>
            <input {...register("clientName")} className="form-input" placeholder="Công ty XYZ" />
          </div>

          <div>
            <label className="form-label">Mô tả</label>
            <textarea {...register("description")} rows={3} className="form-input" placeholder="Mô tả ngắn gọn về dự án..." />
          </div>

          <div>
            <label className="form-label">Ngày kết thúc dự kiến</label>
            <input {...register("endDate")} type="date" className="form-input" />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
            <Button type="submit" isLoading={isSubmitting || mutation.isPending}>Tạo dự án</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectListPage() {
  const { user } = useAuthStore();
  const normalizedRole = user?.role?.toUpperCase?.();
  const canCreateProject = normalizedRole === "ADMIN";
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h1>Dự án</h1>
          <p className="page-subtitle">Danh sách công trình đang triển khai và trạng thái hiện tại.</p>
        </div>
        {canCreateProject && (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
          >
            Tạo dự án
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      )}

      {isError && <ErrorState message="Không thể tải danh sách dự án. Vui lòng thử lại sau." />}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {(data?.projects ?? []).length === 0 ? (
            <EmptyState
              title="Chưa có dự án nào"
              description={canCreateProject ? 'Nhấn "Tạo dự án" để khởi tạo dự án đầu tiên.' : "Liên hệ Admin để được phân quyền vào dự án."}
            />
          ) : (
            (data?.projects ?? []).map((project) => (
              <Link
                key={project.id}
                to={ROUTES.PROJECT_DETAIL(project.id)}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-800">{project.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{project.location}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{project.status}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

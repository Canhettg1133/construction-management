import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@construction/shared";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../shared/components/Button";
import { createTask } from "../api/taskApi";
import { listProjectMembers } from "../../projects/api/memberApi";
import { useUiStore } from "../../../store/uiStore";

const taskSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tiêu đề task").max(200),
  description: z.string().max(2000).optional(),
  assignee: z.string().min(1, "Vui lòng chọn người phụ trách"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().min(1, "Vui lòng chọn deadline"),
});

type TaskForm = z.infer<typeof taskSchema>;

export function TaskCreatePage() {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);

  const { data: members = [] } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => listProjectMembers(String(projectId)),
    enabled: !!projectId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignee: "",
      priority: "MEDIUM",
      dueDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: TaskForm) =>
      createTask(String(projectId), {
        title: payload.title,
        description: payload.description,
        assignedTo: payload.assignee || undefined,
        priority: payload.priority,
        dueDate: payload.dueDate || undefined,
      }),
    onMutate: async (payload) => {
      const queryKey = ["tasks", projectId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousTasks = queryClient.getQueryData<Task[]>(queryKey) ?? [];

      const optimisticTask: Task = {
        id: `temp-${crypto.randomUUID()}`,
        projectId: String(projectId),
        title: payload.title,
        description: payload.description || null,
        assignedTo: payload.assignee || null,
        createdBy: "me",
        reportId: null,
        status: "TO_DO",
        priority: payload.priority,
        dueDate: payload.dueDate || null,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(queryKey, [optimisticTask, ...previousTasks]);
      return { previousTasks, queryKey };
    },
    onSuccess: async (createdTask, _payload, context) => {
      if (context) {
        queryClient.setQueryData<Task[]>(context.queryKey, (current = []) => {
          const withoutTemp = current.filter((task) => !task.id.startsWith("temp-"));
          return [createdTask, ...withoutTemp];
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      showToast({
        type: "success",
        title: "Tạo task thành công",
        description: "Task mới đã xuất hiện trong danh sách công việc.",
      });
      reset();
      navigate(`/projects/${projectId}/tasks`);
    },
    onError: (e, _payload, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
      const message = e instanceof Error ? e.message : "Tạo task thất bại";
      setError(message);
      showToast({ type: "error", title: "Không thể tạo task", description: message });
    },
  });

  const onSubmit = async (data: TaskForm) => {
    setError("");
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="app-card mx-auto w-full max-w-2xl">
      <div className="mb-5 sm:mb-6">
        <h1>Tạo task mới</h1>
        <p className="page-subtitle">Form rút gọn để giao việc nhanh tại công trường.</p>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="form-label">Tiêu đề</label>
          <input {...register("title")} className="form-input" placeholder="Ví dụ: Lắp cốt pha tầng 2" />
          {errors.title && <p className="form-error">{errors.title.message}</p>}
        </div>

        <div>
          <label className="form-label">Mô tả ngắn</label>
          <textarea {...register("description")} rows={3} className="form-input" placeholder="Mô tả ngắn gọn kết quả cần đạt" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Người phụ trách</label>
            <select {...register("assignee")} className="form-input">
              <option value="">Chọn người phụ trách</option>
              {members.map((m) =>
                m.user ? (
                  <option key={m.id} value={m.userId}>
                    {m.user.name} ({m.user.email})
                  </option>
                ) : null
              )}
            </select>
            {errors.assignee && <p className="form-error">{errors.assignee.message}</p>}
          </div>

          <div>
            <label className="form-label">Ưu tiên</label>
            <select {...register("priority")} className="form-input">
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Deadline</label>
          <input {...register("dueDate")} type="date" className="form-input" />
          {errors.dueDate && <p className="form-error">{errors.dueDate.message}</p>}
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Button type="submit" isLoading={createMutation.isPending} className="w-full sm:w-auto">
              Tạo task
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

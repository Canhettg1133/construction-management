import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Edit2, Trash2, MessageSquare, Send, X, AlertTriangle
} from "lucide-react";
import {
  getTask, updateTask, updateTaskStatus, deleteTask,
  listTaskComments, createTaskComment, deleteTaskComment,
} from "../api/taskApi";
import { listProjectMembers } from "../../projects/api/memberApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";
import { useAuthStore } from "../../../store/authStore";
import type { Task, TaskStatus, TaskPriority } from "@construction/shared";

const TASK_STATUS_OPTIONS: Array<{ value: TaskStatus; label: string; color: string }> = [
  { value: "TO_DO", label: "To do", color: "bg-slate-100 text-slate-600" },
  { value: "IN_PROGRESS", label: "Đang làm", color: "bg-blue-50 text-blue-700" },
  { value: "DONE", label: "Hoàn thành", color: "bg-emerald-50 text-emerald-700" },
  { value: "CANCELLED", label: "Hủy", color: "bg-slate-100 text-slate-400" },
];

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: "HIGH", label: "Cao", color: "bg-red-50 text-red-600" },
  { value: "MEDIUM", label: "Trung bình", color: "bg-amber-50 text-amber-600" },
  { value: "LOW", label: "Thấp", color: "bg-slate-100 text-slate-500" },
];

const editTaskSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được trống").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

type EditTaskForm = z.infer<typeof editTaskSchema>;

function EditTaskModal({
  task,
  members,
  projectId,
  onClose,
  onSuccess,
}: {
  task: Task;
  members: Array<{ id: string; userId: string; user?: { id: string; name: string; email: string } }>;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const showToast = useUiStore((s) => s.showToast);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditTaskForm>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      assignedTo: task.assignedTo ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EditTaskForm) =>
      updateTask(projectId, task.id, {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        dueDate: data.dueDate || undefined,
        assignedTo: data.assignedTo || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", projectId, task.id], updated);
      showToast({ type: "success", title: "Đã cập nhật task" });
      onSuccess();
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Cập nhật thất bại" });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Chỉnh sửa task</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit((data) => mutation.mutateAsync(data))}
          className="space-y-4 p-5"
        >
          <div>
            <label className="form-label">Tiêu đề</label>
            <input {...register("title")} className="form-input" />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>
          <div>
            <label className="form-label">Mô tả</label>
            <textarea {...register("description")} rows={3} className="form-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Ưu tiên</label>
              <select {...register("priority")} className="form-input">
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Deadline</label>
              <input {...register("dueDate")} type="date" className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Người phụ trách</label>
            <select {...register("assignedTo")} className="form-input">
              <option value="">— Chưa giao —</option>
              {members.map((m) =>
                m.user ? (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.user.email})
                  </option>
                ) : null
              )}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
            <Button type="submit" isLoading={mutation.isPending}>Lưu thay đổi</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TaskDetailPage() {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const { user: currentUser } = useAuthStore();

  const [showEdit, setShowEdit] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const { data: task, isLoading: taskLoading, isError } = useQuery({
    queryKey: ["task", projectId, taskId],
    queryFn: () => getTask(String(projectId), String(taskId)),
    enabled: !!projectId && !!taskId,
  });

  const { data: members } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => listProjectMembers(String(projectId)),
    enabled: !!projectId,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["task-comments", projectId, taskId],
    queryFn: () => listTaskComments(String(projectId), String(taskId)),
    enabled: !!projectId && !!taskId,
    refetchInterval: 30000,
  });

  const canEdit =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "PROJECT_MANAGER" ||
    currentUser?.role === "SITE_ENGINEER";

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => updateTaskStatus(String(projectId), String(taskId), status),
    onMutate: async (status) => {
      const detailKey = ["task", projectId, taskId] as const;
      const listKey = ["tasks", projectId] as const;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);
      const previousDetail = queryClient.getQueryData<Task>(detailKey);
      const previousList = queryClient.getQueryData<Task[]>(listKey);
      queryClient.setQueryData<Task>(detailKey, (current) =>
        current ? { ...current, status } : current
      );
      queryClient.setQueryData<Task[]>(listKey, (current = []) =>
        current.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
      return { previousDetail, previousList, detailKey, listKey };
    },
    onError: (_error, _status, context) => {
      if (context) {
        queryClient.setQueryData(context.detailKey, context.previousDetail);
        queryClient.setQueryData(context.listKey, context.previousList);
      }
      showToast({ type: "error", title: "Cập nhật thất bại" });
    },
    onSuccess: (updatedTask, _status, context) => {
      if (context) {
        queryClient.setQueryData(context.detailKey, updatedTask);
        queryClient.setQueryData<Task[]>(context.listKey, (current = []) =>
          current.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      }
      showToast({ type: "success", title: "Đã cập nhật trạng thái" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(String(projectId), String(taskId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      showToast({ type: "success", title: "Đã xóa task" });
      navigate(`/projects/${projectId}/tasks`);
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      createTaskComment(String(projectId), String(taskId), content),
    onSuccess: () => {
      setCommentText("");
      refetchComments();
      showToast({ type: "success", title: "Đã thêm bình luận" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể thêm bình luận" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      deleteTaskComment(String(projectId), String(taskId), commentId),
    onSuccess: () => {
      refetchComments();
      showToast({ type: "success", title: "Đã xóa bình luận" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa bình luận" });
    },
  });

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    await addCommentMutation.mutateAsync(commentText.trim());
    setIsSubmittingComment(false);
  };

  if (taskLoading) {
    return <div className="space-y-3"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>;
  }

  if (isError || !task) {
    return <ErrorState message="Không tải được chi tiết task. Vui lòng thử lại." />;
  }

  const currentStatus = TASK_STATUS_OPTIONS.find((s) => s.value === task.status);
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === task.priority);
  const isOverdue =
    task.dueDate &&
    task.status !== "DONE" &&
    task.status !== "CANCELLED" &&
    new Date(task.dueDate) < new Date();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/projects/${projectId}/tasks`)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
        >
          ← Tasks
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-slate-800">{task.title}</h2>
          {task.assignee && (
            <p className="text-xs text-slate-500">Giao cho: {task.assignee.name}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Sửa
            </button>
            <button
              onClick={() => {
                if (confirm("Xóa task này?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Status & Info */}
      <div className="app-card space-y-4">
        {canEdit && (
          <div>
            <label className="form-label text-xs text-slate-500 uppercase tracking-wide">Trạng thái</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TASK_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => statusMutation.mutate(opt.value)}
                  disabled={statusMutation.isPending}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-all ${
                    task.status === opt.value
                      ? `${opt.color} ring-2 ring-offset-1 ring-slate-300`
                      : `${opt.color} opacity-50 hover:opacity-75`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!canEdit && currentStatus && (
          <div>
            <label className="form-label text-xs text-slate-500 uppercase tracking-wide">Trạng thái</label>
            <span className={`ml-1 rounded-xl px-3 py-1.5 text-sm font-medium ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {currentPriority && (
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-xs text-slate-500">Ưu tiên: </span>
              <span className={`text-sm font-semibold ${currentPriority.color}`}>
                {currentPriority.label}
              </span>
            </div>
          )}
          <div className={`rounded-xl p-3 ${isOverdue ? "bg-red-50" : "bg-slate-50"}`}>
            <span className="text-xs text-slate-500">Deadline: </span>
            <span className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString("vi-VN") : "Chưa có"}
            </span>
            {isOverdue && (
              <span className="ml-1 flex items-center gap-0.5 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" /> Quá hạn
              </span>
            )}
          </div>
        </div>

        {task.description && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mô tả</h3>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {task.description}
            </div>
          </div>
        )}
      </div>

      {/* Comment Section */}
      <div className="app-card space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">
            Bình luận ({comments.length})
          </h3>
        </div>

        {comments.length > 0 && (
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700 text-sm font-semibold">
                  {comment.author?.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {comment.author?.name ?? "Người dùng"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">
                        {new Date(comment.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {new Date(comment.createdAt).toLocaleDateString("vi-VN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {comment.authorId === currentUser?.id && (
                        <button
                          onClick={() => {
                            if (confirm("Xóa bình luận này?")) {
                              deleteCommentMutation.mutate(comment.id);
                            }
                          }}
                          disabled={deleteCommentMutation.isPending}
                          className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {comments.length === 0 && (
          <p className="text-sm text-slate-400">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
        )}

        <form onSubmit={handleCommentSubmit} className="flex gap-2">
          <textarea
            ref={commentRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit(e);
              }
            }}
            placeholder="Viết bình luận... (Enter để gửi, Shift+Enter xuống dòng)"
            rows={2}
            className="form-input flex-1 resize-none text-sm"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmittingComment}
            className="flex h-auto items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {showEdit && members && (
        <EditTaskModal
          task={task}
          members={members}
          projectId={String(projectId)}
          onClose={() => setShowEdit(false)}
          onSuccess={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}

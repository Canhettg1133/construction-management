import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Edit2, Trash2, MessageSquare, Send, X, AlertTriangle,
  CheckCircle, XCircle, ShieldAlert,
} from "lucide-react";
import {
  getTask, updateTask, updateTaskStatus, deleteTask,
  listTaskComments, createTaskComment, deleteTaskComment,
  submitTaskForApproval,
} from "../api/taskApi";
import { listProjectMembers } from "../../projects/api/memberApi";
import { approveTask, rejectTask } from "../../approvals/api/approvalApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { Button } from "../../../shared/components/Button";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { usePermission } from "../../../shared/hooks/usePermission";
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
  requiresApproval: z.boolean(),
});

type EditTaskForm = z.infer<typeof editTaskSchema>;
type TaskListCache = Task[] | { tasks?: Task[] } | undefined;

function readTasksFromCache(cache: TaskListCache): Task[] {
  if (Array.isArray(cache)) {
    return cache;
  }

  if (cache && typeof cache === "object" && Array.isArray(cache.tasks)) {
    return cache.tasks;
  }

  return [];
}

function writeTasksToCache(cache: TaskListCache, tasks: Task[]) {
  if (Array.isArray(cache)) {
    return tasks;
  }

  if (cache && typeof cache === "object") {
    return {
      ...cache,
      tasks,
    };
  }

  return tasks;
}

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
      requiresApproval: task.requiresApproval,
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
        requiresApproval: data.requiresApproval,
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
          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                {...register("requiresApproval")}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700">Yêu cầu duyệt trước khi hoàn thành</span>
            </label>
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
  const currentProjectId = projectId ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const { user: currentUser } = useAuthStore();
  const { has: canUseTaskStandard } = usePermission({
    projectId: currentProjectId,
    toolId: "TASK",
    minLevel: "STANDARD",
  });
  const { has: canUseTaskAdmin } = usePermission({
    projectId: currentProjectId,
    toolId: "TASK",
    minLevel: "ADMIN",
  });
  const { has: canProjectAdmin } = usePermission({
    projectId: currentProjectId,
    toolId: "PROJECT",
    minLevel: "ADMIN",
  });

  const [showEdit, setShowEdit] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const { data: task, isLoading: taskLoading, isError } = useQuery({
    queryKey: ["task", currentProjectId, taskId],
    queryFn: () => getTask(currentProjectId, String(taskId)),
    enabled: Boolean(currentProjectId) && Boolean(taskId),
  });

  const { data: members } = useQuery({
    queryKey: ["project-members", currentProjectId],
    queryFn: () => listProjectMembers(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["task-comments", currentProjectId, taskId],
    queryFn: () => listTaskComments(currentProjectId, String(taskId)),
    enabled: Boolean(currentProjectId) && Boolean(taskId),
    refetchInterval: 30000,
  });

  const canEdit =
    canUseTaskStandard &&
    (task?.createdBy === currentUser?.id || task?.assignedTo === currentUser?.id);
  const canSubmitForApproval = canUseTaskStandard && task?.assignedTo === currentUser?.id;

  const statusMutation = useMutation({
    mutationFn: (status: TaskStatus) => updateTaskStatus(currentProjectId, String(taskId), status),
    onMutate: async (status) => {
      const detailKey = ["task", currentProjectId, taskId] as const;
      const listKey = ["tasks", currentProjectId] as const;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: listKey }),
      ]);
      const previousDetail = queryClient.getQueryData<Task>(detailKey);
      const previousList = queryClient.getQueryData<TaskListCache>(listKey);
      queryClient.setQueryData<Task>(detailKey, (current) =>
        current ? { ...current, status } : current
      );
      queryClient.setQueryData(listKey, (current: TaskListCache) => {
        const nextTasks = readTasksFromCache(current).map((t) => (t.id === taskId ? { ...t, status } : t));
        return writeTasksToCache(current, nextTasks);
      });
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
        queryClient.setQueryData(context.listKey, (current: TaskListCache) => {
          const nextTasks = readTasksFromCache(current).map((t) => (t.id === updatedTask.id ? updatedTask : t));
          return writeTasksToCache(current, nextTasks);
        });
      }
      showToast({ type: "success", title: "Đã cập nhật trạng thái" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(currentProjectId, String(taskId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", currentProjectId] });
      showToast({ type: "success", title: "Đã xóa task" });
      navigate(`/projects/${currentProjectId}/tasks`);
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      createTaskComment(currentProjectId, String(taskId), content),
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
      deleteTaskComment(currentProjectId, String(taskId), commentId),
    onSuccess: () => {
      refetchComments();
      showToast({ type: "success", title: "Đã xóa bình luận" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa bình luận" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitTaskForApproval(currentProjectId, String(taskId)),
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", currentProjectId, taskId], updated);
      queryClient.invalidateQueries({ queryKey: ["tasks", currentProjectId] });
      showToast({ type: "success", title: "Đã gửi duyệt task" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Gửi duyệt thất bại" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveTask(String(taskId)),
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", currentProjectId, taskId], updated);
      queryClient.invalidateQueries({ queryKey: ["tasks", currentProjectId] });
      showToast({ type: "success", title: "Đã duyệt task" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Duyệt thất bại" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectTask(String(taskId), reason),
    onSuccess: (updated) => {
      queryClient.setQueryData(["task", currentProjectId, taskId], updated);
      queryClient.invalidateQueries({ queryKey: ["tasks", currentProjectId] });
      setShowRejectModal(false);
      setRejectReason("");
      showToast({ type: "success", title: "Đã từ chối task" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Từ chối thất bại" });
    },
  });

  const isPmOrAdmin = canProjectAdmin;

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

  const APPROVAL_STATUS_CONFIG = {
    PENDING: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-700", icon: ShieldAlert },
    APPROVED: { label: "Đã duyệt", color: "bg-emerald-50 text-emerald-700", icon: CheckCircle },
    REJECTED: { label: "Từ chối", color: "bg-red-50 text-red-700", icon: XCircle },
  };
  const approvalConfig = task.requiresApproval ? APPROVAL_STATUS_CONFIG[task.approvalStatus] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
          <button
          onClick={() => navigate(`/projects/${currentProjectId}/tasks`)}
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
        <PermissionGate projectId={currentProjectId} toolId="TASK" minLevel="STANDARD">
          <div className="flex items-center gap-1">
            {task.requiresApproval && task.approvalStatus === "PENDING" && (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmitForApproval || submitMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-100"
              >
                <Send className="h-3.5 w-3.5" />
                Gửi duyệt
              </button>
            )}
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Sửa
            </button>
            {canUseTaskAdmin && (
              <button
                onClick={() => {
                  if (confirm("Xóa task này?")) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </PermissionGate>
        {/* PM/Admin approval actions */}
        {isPmOrAdmin && task.requiresApproval && task.approvalStatus === "PENDING" && (
          <SpecialPrivilegeGate projectId={currentProjectId} privilege="QUALITY_SIGNER">
            <div className="flex items-center gap-1">
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Duyệt
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={rejectMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Từ chối
              </button>
            </div>
          </SpecialPrivilegeGate>
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

        {/* Approval status */}
        {task.requiresApproval && approvalConfig && (
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <approvalConfig.icon className={`h-4 w-4 ${approvalConfig.color.replace("bg-", "text-").replace(" text-", "")}`} />
                <span className={`rounded-xl px-2.5 py-1 text-xs font-medium ${approvalConfig.color}`}>
                  {approvalConfig.label}
                </span>
              </div>
            </div>
            {task.approvalStatus === "REJECTED" && task.rejectedReason && (
              <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-2 text-xs text-red-600">
                <span className="font-semibold">Lý do từ chối:</span> {task.rejectedReason}
              </div>
            )}
          </div>
        )}

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
                      {canUseTaskAdmin && (
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

        {canUseTaskStandard ? (
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
        ) : (
          <p className="text-xs text-slate-500">Bạn chỉ có quyền xem bình luận.</p>
        )}
      </div>

      {showEdit && members && (
        <EditTaskModal
          task={task}
          members={members}
          projectId={currentProjectId}
          onClose={() => setShowEdit(false)}
          onSuccess={() => setShowEdit(false)}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Từ chối task</h2>
              <button onClick={() => setShowRejectModal(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="form-label">Lý do từ chối</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="form-input"
                  placeholder="Nhập lý do từ chối..."
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Hủy</Button>
                <Button
                  onClick={() => rejectMutation.mutate(rejectReason)}
                  isLoading={rejectMutation.isPending}
                  disabled={!rejectReason.trim()}
                >
                  Từ chối
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

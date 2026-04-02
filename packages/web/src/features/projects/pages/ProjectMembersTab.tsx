import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, X, Trash2 } from "lucide-react";
import { listProjectMembers, addProjectMember, updateMemberRole, removeProjectMember } from "../api/memberApi";
import { listUsers } from "../../users/api/userApi";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { Button } from "../../../shared/components/Button";
import { useUiStore } from "../../../store/uiStore";
import { useAuthStore } from "../../../store/authStore";
import { ROLE_LABELS } from "@construction/shared";
import type { ProjectMemberRole } from "@construction/shared";

const MEMBER_ROLES: ProjectMemberRole[] = ["PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"];

const addMemberSchema = z.object({
  userId: z.string().min(1, "Vui lòng chọn người dùng"),
  role: z.enum(["PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"]),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

function AddMemberModal({ projectId, existingUserIds, onClose, onSuccess }: {
  projectId: string;
  existingUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const showToast = useUiStore((s) => s.showToast);
  const { register, handleSubmit, formState: { errors } } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: "SITE_ENGINEER" },
  });

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => listUsers({ pageSize: 100 }),
  });

  const mutation = useMutation({
    mutationFn: (data: AddMemberForm) => addProjectMember(projectId, data.userId, data.role),
    onSuccess: () => {
      showToast({ type: "success", title: "Đã thêm thành viên" });
      onSuccess();
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể thêm thành viên" });
    },
  });

  const availableUsers = allUsers?.users.filter((u) => !existingUserIds.includes(u.id) && u.isActive) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Thêm thành viên</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit((data) => mutation.mutateAsync(data))} className="space-y-4 p-5">
          <div>
            <label className="form-label">Người dùng</label>
            <select {...register("userId")} className="form-input">
              <option value="">— Chọn người dùng —</option>
              {isLoading ? (
                <option disabled>Đang tải...</option>
              ) : availableUsers.length === 0 ? (
                <option disabled>Không có người dùng khả dụng</option>
              ) : (
                availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))
              )}
            </select>
            {errors.userId && <p className="form-error">{errors.userId.message}</p>}
          </div>

          <div>
            <label className="form-label">Vai trò trong dự án</label>
            <select {...register("role")} className="form-input">
              {MEMBER_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
            <Button type="submit" isLoading={mutation.isPending}>Thêm thành viên</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectMembersTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const { user } = useAuthStore();
  const normalizedRole = user?.role?.toUpperCase?.();
  const canManage = normalizedRole === "ADMIN" || normalizedRole === "PROJECT_MANAGER";

  const [showAdd, setShowAdd] = useState(false);

  const { data: members, isLoading, isError } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => listProjectMembers(String(projectId)),
    enabled: !!projectId,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectMemberRole }) =>
      updateMemberRole(memberId, String(projectId), role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      showToast({ type: "success", title: "Đã cập nhật vai trò" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể cập nhật vai trò" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeProjectMember(memberId, String(projectId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
      showToast({ type: "success", title: "Đã xóa thành viên khỏi dự án" });
    },
    onError: (e: unknown) => {
      showToast({ type: "error", title: "Lỗi", description: e instanceof Error ? e.message : "Không thể xóa thành viên" });
    },
  });

  if (isLoading) {
    return <div className="space-y-3"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>;
  }

  if (isError) {
    return <ErrorState message="Không tải được danh sách thành viên." />;
  }

  const membersList = members ?? [];
  const existingUserIds = membersList.map((m) => m.userId);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Thành viên dự án</h2>
          <p className="page-subtitle">{membersList.length} thành viên tham gia dự án.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Thêm thành viên
          </button>
        )}
      </div>

      {membersList.length === 0 ? (
        <EmptyState
          title="Chưa có thành viên"
          description={canManage ? "Thêm thành viên để bắt đầu phân công công việc." : "Chưa có thành viên nào trong dự án."}
        />
      ) : (
        <div className="space-y-3">
          {membersList.map((member) => (
            <div key={member.id} className="app-card flex items-center gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                {member.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{member.user?.name ?? "Unknown"}</p>
                <p className="text-xs text-slate-500">{member.user?.email}</p>
                {member.user?.phone && <p className="text-xs text-slate-400">{member.user.phone}</p>}
              </div>
              {canManage ? (
                <>
                  <select
                    value={member.role}
                    onChange={(e) => updateRoleMutation.mutate({ memberId: member.id, role: e.target.value as ProjectMemberRole })}
                    disabled={updateRoleMutation.isPending}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (confirm(`Xóa ${member.user?.name} khỏi dự án?`)) {
                        removeMutation.mutate(member.id);
                      }
                    }}
                    disabled={removeMutation.isPending}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    title="Xóa khỏi dự án"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {ROLE_LABELS[member.role]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddMemberModal
          projectId={String(projectId)}
          existingUserIds={existingUserIds}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ["project-members", projectId] }); }}
        />
      )}
    </div>
  );
}

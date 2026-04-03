import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Trash2, UserPlus, X } from "lucide-react";
import { PROJECT_ROLES, PROJECT_ROLE_LABELS } from "@construction/shared";
import type { ProjectRole } from "@construction/shared";
import { listUsers } from "../../users/api/userApi";
import { addProjectMember, listProjectMembers, removeProjectMember, updateMemberRole } from "../api/memberApi";
import { Button } from "../../../shared/components/Button";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { usePermission } from "../../../shared/hooks/usePermission";
import { useUiStore } from "../../../store/uiStore";

const MEMBER_ROLES: ProjectRole[] = PROJECT_ROLES;

const addMemberSchema = z.object({
  userId: z.string().min(1, "Vui long chon nguoi dung"),
  role: z.enum(PROJECT_ROLES as unknown as [string, ...string[]]),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

function AddMemberModal({
  projectId,
  existingUserIds,
  onClose,
  onSuccess,
}: {
  projectId: string;
  existingUserIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const showToast = useUiStore((state) => state.showToast);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: "ENGINEER" },
  });

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => listUsers({ pageSize: 100 }),
  });

  const mutation = useMutation({
    mutationFn: (payload: AddMemberForm) => addProjectMember(projectId, payload.userId, payload.role as ProjectRole),
    onSuccess: () => {
      showToast({ type: "success", title: "Da them thanh vien" });
      onSuccess();
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the them thanh vien",
      });
    },
  });

  const availableUsers = allUsers?.users.filter((user) => !existingUserIds.includes(user.id) && user.isActive) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Them thanh vien</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((payload) => mutation.mutateAsync(payload))} className="space-y-4 p-5">
          <div>
            <label className="form-label">Nguoi dung</label>
            <select {...register("userId")} className="form-input">
              <option value="">- Chon nguoi dung -</option>
              {isLoading ? (
                <option disabled>Dang tai...</option>
              ) : availableUsers.length === 0 ? (
                <option disabled>Khong co nguoi dung kha dung</option>
              ) : (
                availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))
              )}
            </select>
            {errors.userId && <p className="form-error">{errors.userId.message}</p>}
          </div>

          <div>
            <label className="form-label">Vai tro trong du an</label>
            <select {...register("role")} className="form-input">
              {MEMBER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {PROJECT_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Huy
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              Them thanh vien
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectMembersTab() {
  const { id: projectId } = useParams<{ id: string }>();
  const currentProjectId = projectId ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const [showAdd, setShowAdd] = useState(false);

  const { has: canManageProject } = usePermission({
    projectId: currentProjectId,
    toolId: "PROJECT",
    minLevel: "ADMIN",
  });

  const { data: members, isLoading, isError } = useQuery({
    queryKey: ["project-members", currentProjectId],
    queryFn: () => listProjectMembers(currentProjectId),
    enabled: Boolean(currentProjectId),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectRole }) =>
      updateMemberRole(memberId, currentProjectId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", currentProjectId] });
      showToast({ type: "success", title: "Da cap nhat vai tro" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the cap nhat vai tro",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeProjectMember(memberId, currentProjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", currentProjectId] });
      showToast({ type: "success", title: "Da xoa thanh vien khoi du an" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the xoa thanh vien",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Khong tai duoc danh sach thanh vien." />;
  }

  const memberList = members ?? [];
  const existingUserIds = memberList.map((member) => member.userId);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Thanh vien du an</h2>
          <p className="page-subtitle">{memberList.length} thanh vien tham gia du an.</p>
        </div>
        <PermissionGate projectId={currentProjectId} toolId="PROJECT" minLevel="ADMIN">
          <button
            onClick={() => setShowAdd(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Them thanh vien
          </button>
        </PermissionGate>
      </div>

      {memberList.length === 0 ? (
        <EmptyState
          title="Chua co thanh vien"
          description={canManageProject ? "Them thanh vien de bat dau phan cong cong viec." : "Chua co thanh vien nao trong du an."}
        />
      ) : (
        <div className="space-y-3">
          {memberList.map((member) => (
            <div key={member.id} className="app-card flex items-center gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                {member.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{member.user?.name ?? "Unknown"}</p>
                <p className="text-xs text-slate-500">{member.user?.email}</p>
                {member.user?.phone && <p className="text-xs text-slate-400">{member.user.phone}</p>}
              </div>

              <PermissionGate
                projectId={currentProjectId}
                toolId="PROJECT"
                minLevel="ADMIN"
                fallback={
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {PROJECT_ROLE_LABELS[member.role as ProjectRole]}
                  </span>
                }
              >
                <>
                  <select
                    value={member.role}
                    onChange={(event) =>
                      updateRoleMutation.mutate({
                        memberId: member.id,
                        role: event.target.value as ProjectRole,
                      })
                    }
                    disabled={updateRoleMutation.isPending}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {MEMBER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {PROJECT_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (confirm(`Xoa ${member.user?.name} khoi du an?`)) {
                        removeMutation.mutate(member.id);
                      }
                    }}
                    disabled={removeMutation.isPending}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    title="Xoa khoi du an"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              </PermissionGate>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddMemberModal
          projectId={currentProjectId}
          existingUserIds={existingUserIds}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            queryClient.invalidateQueries({ queryKey: ["project-members", currentProjectId] });
          }}
        />
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, UserPlus, Edit2, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { listUsers, createUser, updateUser, toggleUserStatus } from "../api/userApi";
import { Button } from "../../../shared/components/Button";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { useUiStore } from "../../../store/uiStore";
import { useAuthStore } from "../../../store/authStore";
import { ROLE_LABELS } from "@construction/shared";
import type { User, UserRole } from "@construction/shared";

const USER_ROLES: UserRole[] = ["ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"];

const createUserSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").max(200),
  email: z.string().email("Email không hợp lệ"),
  password: z.string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .regex(/[A-Z]/, "Phải có ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Phải có ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Phải có ít nhất 1 số"),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"]),
  phone: z.string().max(20).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "SITE_ENGINEER", "VIEWER"]).optional(),
  phone: z.string().max(20).optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type UpdateUserForm = z.infer<typeof updateUserSchema>;

interface UserFormProps {
  user?: User;
  onClose: () => void;
  onSuccess: () => void;
}

function UserFormModal({ user, onClose, onSuccess }: UserFormProps) {
  const showToast = useUiStore((s) => s.showToast);
  const isEdit = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserForm | UpdateUserForm>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: user
      ? { name: user.name, role: user.role, phone: user.phone ?? "" }
      : { role: "VIEWER" },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) =>
      createUser({ ...data, phone: data.phone || undefined }),
    onSuccess: () => {
      showToast({ type: "success", title: "Tạo người dùng thành công" });
      onSuccess();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Tạo người dùng thất bại";
      showToast({ type: "error", title: "Lỗi", description: msg });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserForm) =>
      updateUser(user!.id, { ...data, phone: data.phone || undefined }),
    onSuccess: () => {
      showToast({ type: "success", title: "Cập nhật người dùng thành công" });
      onSuccess();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Cập nhật thất bại";
      showToast({ type: "error", title: "Lỗi", description: msg });
    },
  });

  const onSubmit = async (data: CreateUserForm | UpdateUserForm) => {
    if (isEdit) {
      await updateMutation.mutateAsync(data as UpdateUserForm);
    } else {
      await createMutation.mutateAsync(data as CreateUserForm);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
          <div>
            <label className="form-label">Họ tên</label>
            <input {...register("name")} className="form-input" placeholder="Nguyễn Văn A" />
            {errors.name && <p className="form-error">{errors.name.message as string}</p>}
          </div>

          <div>
            <label className="form-label">Email</label>
            {isEdit ? (
              <input value={user?.email} readOnly className="form-input bg-slate-50 text-slate-500" />
            ) : (
              <>
                <input {...register("email")} type="email" className="form-input" placeholder="email@example.com" />
                {(errors as { email?: { message?: unknown } }).email && <p className="form-error">{(errors as { email?: { message?: unknown } }).email?.message as string}</p>}
              </>
            )}
          </div>

          {!isEdit && (
            <div>
              <label className="form-label">Mật khẩu</label>
              <input {...register("password")} type="password" className="form-input" placeholder="••••••••" />
              {(errors as { password?: { message?: unknown } }).password && <p className="form-error">{(errors as { password?: { message?: unknown } }).password?.message as string}</p>}
            </div>
          )}

          <div>
            <label className="form-label">Vai trò</label>
            <select {...register("role")} className="form-input">
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            {errors.role && <p className="form-error">{errors.role.message as string}</p>}
          </div>

          <div>
            <label className="form-label">Số điện thoại (tùy chọn)</label>
            <input {...register("phone")} type="tel" className="form-input" placeholder="0912 345 678" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UserManagementPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [page, setPage] = useState(1);

  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const { user: currentUser } = useAuthStore();
  const canManage = currentUser?.role === "ADMIN";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, roleFilter, search],
    queryFn: () =>
      listUsers({
        page,
        pageSize: 20,
        role: roleFilter || undefined,
        q: search || undefined,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatus(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["users"] });
      const prev = queryClient.getQueryData(["users", page, roleFilter, search]);
      queryClient.setQueryData(["users", page, roleFilter, search], (old: typeof data) =>
        old ? { ...old, users: old.users.map((u) => (u.id === id ? { ...u, isActive } : u)) } : old
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["users", page, roleFilter, search], ctx.prev);
      showToast({ type: "error", title: "Không thể thay đổi trạng thái" });
    },
    onSuccess: (_, { isActive }) => {
      showToast({
        type: "success",
        title: isActive ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản",
      });
    },
  });

  const openCreate = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleSuccess = () => {
    setShowModal(false);
    setEditingUser(null);
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  const users = data?.users ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h1>Quản lý người dùng</h1>
          <p className="page-subtitle">Quản trị tài khoản và phân quyền theo vai trò dự án.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
          >
            <UserPlus className="h-4 w-4" />
            Tạo người dùng
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên hoặc email..."
            className="form-input pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as UserRole | ""); setPage(1); }}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Tất cả vai trò</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      )}

      {isError && <ErrorState message="Không thể tải danh sách người dùng. Vui lòng thử lại." />}

      {!isLoading && !isError && users.length === 0 && (
        <EmptyState
          title="Không tìm thấy người dùng"
          description={search || roleFilter ? "Thử thay đổi bộ lọc tìm kiếm." : "Tạo tài khoản mới để bắt đầu."}
          action={
            canManage && !search && !roleFilter ? (
              <button onClick={openCreate} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                Tạo người dùng
              </button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && users.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-3 font-medium text-slate-500">Người dùng</th>
                  <th className="pb-3 font-medium text-slate-500">Vai trò</th>
                  <th className="pb-3 font-medium text-slate-500">Trạng thái</th>
                  <th className="pb-3 font-medium text-slate-500">Đăng nhập cuối</th>
                  {canManage && <th className="pb-3 font-medium text-slate-500 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="group">
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-600"
                      }`}>
                        {user.isActive ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>
                    {canManage && (
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() =>
                              toggleMutation.mutate({ id: user.id, isActive: !user.isActive })
                            }
                            disabled={toggleMutation.isPending || user.id === currentUser?.id}
                            title={user.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                          >
                            {user.isActive ? (
                              <ToggleRight className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => openEdit(user)}
                            title="Chỉnh sửa"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40"
              >
                ← Trước
              </button>
              <span className="px-3 text-sm text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <UserFormModal
          user={editingUser ?? undefined}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

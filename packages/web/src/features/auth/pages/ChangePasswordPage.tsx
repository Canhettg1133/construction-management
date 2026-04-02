import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../shared/components/Button";
import { changePassword } from "../api/authApi";
import { useUiStore } from "../../../store/uiStore";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
    confirmPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const showToast = useUiStore((s) => s.showToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setIsLoading(true);
    setError("");
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      showToast({ type: "success", title: "Đổi mật khẩu thành công", description: "Vui lòng ghi nhớ mật khẩu mới của bạn." });
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Có lỗi xảy ra";
      setError(msg);
      showToast({ type: "error", title: "Không thể đổi mật khẩu", description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-card mx-auto max-w-xl">
      <div className="mb-5 sm:mb-6">
        <h1>Đổi mật khẩu</h1>
        <p className="page-subtitle">Cập nhật mật khẩu định kỳ để tăng bảo mật tài khoản.</p>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="form-label">Mật khẩu hiện tại</label>
          <input {...register("currentPassword")} type="password" autoComplete="current-password" className="form-input" />
          {errors.currentPassword && <p className="form-error">{errors.currentPassword.message}</p>}
        </div>

        <div>
          <label className="form-label">Mật khẩu mới</label>
          <input {...register("newPassword")} type="password" autoComplete="new-password" className="form-input" />
          {errors.newPassword && <p className="form-error">{errors.newPassword.message}</p>}
        </div>

        <div>
          <label className="form-label">Xác nhận mật khẩu mới</label>
          <input {...register("confirmPassword")} type="password" autoComplete="new-password" className="form-input" />
          {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
        </div>

        <Button type="submit" isLoading={isLoading}>
          Cập nhật mật khẩu
        </Button>
      </form>
    </div>
  );
}

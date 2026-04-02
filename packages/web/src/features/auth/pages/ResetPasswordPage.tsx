import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../shared/components/Button";
import { ROUTES } from "../../../shared/constants/routes";
import { resetPassword } from "../api/authApi";

const resetSchema = z
  .object({
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { token } = useParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    if (!token) {
      setError("Token đặt lại mật khẩu không hợp lệ");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      await resetPassword({
        token,
        newPassword: data.password,
      });
      setMessage("Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...");
      setTimeout(() => navigate(ROUTES.LOGIN), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Nhập mật khẩu mới cho tài khoản của bạn</p>

        {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="form-label">Mật khẩu mới</label>
            <input {...register("password")} type="password" autoComplete="new-password" className="form-input" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div>
            <label className="form-label">Xác nhận mật khẩu mới</label>
            <input {...register("confirmPassword")} type="password" autoComplete="new-password" className="form-input" />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Cập nhật mật khẩu
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to={ROUTES.LOGIN} className="font-medium text-brand-600 hover:text-brand-700">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

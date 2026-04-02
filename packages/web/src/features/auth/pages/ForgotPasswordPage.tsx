import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../../../shared/components/Button";
import { ROUTES } from "../../../shared/constants/routes";
import { forgotPassword } from "../api/authApi";

const forgotSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      await forgotPassword(data);
      setMessage("Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">Quên mật khẩu</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Nhập email để nhận link đặt lại mật khẩu</p>

        {message && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input {...register("email")} type="email" autoComplete="email" className="form-input" placeholder="email@example.com" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Gửi link đặt lại
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

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../../../store/authStore";
import { Button } from "../../../shared/components/Button";
import { ROUTES } from "../../../shared/constants/routes";
import { login } from "../api/authApi";

const loginSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(1, "Mật khẩu không được để trống"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError("");
    try {
      const user = await login(data);
      setUser(user);
      navigate(ROUTES.DASHBOARD);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">Quản lý công trình</h1>
        <p className="mt-2 text-center text-sm text-slate-500">Đăng nhập để tiếp tục</p>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input {...register("email")} type="email" autoComplete="email" className="form-input" placeholder="email@example.com" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div>
            <label className="form-label">Mật khẩu</label>
            <input {...register("password")} type="password" autoComplete="current-password" className="form-input" placeholder="••••••••" />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Đăng nhập
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to={ROUTES.FORGOT_PASSWORD} className="font-medium text-brand-600 hover:text-brand-700">
            Quên mật khẩu?
          </Link>
        </p>
      </div>
    </div>
  );
}

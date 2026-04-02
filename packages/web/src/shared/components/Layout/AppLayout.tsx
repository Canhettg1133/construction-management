import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";
import { ROUTES } from "../../constants/routes";
import { LayoutDashboard, FolderKanban, Users, FileText, LogOut, Menu, X, KeyRound, UserCircle2, Bell, Sparkles } from "lucide-react";
import { logout as logoutApi } from "../../../features/auth/api/authApi";

const navItems = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.PROJECTS, label: "Dự án", icon: FolderKanban },
  { to: ROUTES.USERS, label: "Người dùng", icon: Users, roles: ["ADMIN"] },
  { to: ROUTES.AUDIT_LOGS, label: "Audit Logs", icon: FileText, roles: ["ADMIN", "PROJECT_MANAGER"] },
  { to: ROUTES.SETTINGS_PROFILE, label: "Hồ sơ", icon: UserCircle2 },
  { to: ROUTES.SETTINGS_CHANGE_PASSWORD, label: "Đổi mật khẩu", icon: KeyRound },
];

export function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, toast, clearToast } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedRole = user?.role?.toUpperCase?.();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAuth();
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-slate-50 text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Xây Dựng</p>
              <p className="text-xs text-slate-500">Construction Console</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Đóng sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {navItems
            .filter((item) => !item.roles || (normalizedRole && item.roles.includes(normalizedRole)))
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <button onClick={toggleSidebar} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở sidebar">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-sm text-slate-500 sm:block">Welcome back, {user?.name?.split(" ").slice(-1)[0]}</div>
          <button className="ml-auto rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100" aria-label="Thông báo">
            <Bell className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto w-full max-w-7xl"> 
            <Outlet />
          </div>
        </main>
      </div>

      {sidebarOpen && <div onClick={toggleSidebar} className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" />}

      {toast && (
        <div className="toast-enter fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold ${toast.type === "error" ? "text-red-700" : toast.type === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                {toast.title}
              </p>
              {toast.description && <p className="mt-1 text-xs text-slate-500">{toast.description}</p>}
            </div>
            <button onClick={clearToast} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng thông báo">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

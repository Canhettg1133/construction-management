import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare,
  ClipboardCheck,
  FileText,
  Files,
  FolderKanban,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  UserCircle2,
  Users,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import { hasMinPermission, type PermissionLevel, type SystemRole, type ToolId } from "@construction/shared";
import { Link, Outlet, useLocation, useMatch, useNavigate } from "react-router-dom";
import { logout as logoutApi } from "../../../features/auth/api/authApi";
import { getProject } from "../../../features/projects/api/projectApi";
import { useProjectPermissions } from "../../hooks/useProjectPermissions";
import { ROUTES } from "../../constants/routes";
import { useAuthStore } from "../../../store/authStore";
import { useNotificationStore } from "../../../store/notificationStore";
import { useUiStore } from "../../../store/uiStore";
import { connectSocket, disconnectSocket } from "../../../socket/socketClient";
import { NotificationBell } from "../NotificationBell";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  systemRoles?: SystemRole[];
  toolId?: ToolId;
  minLevel?: PermissionLevel;
}

const DESKTOP_SIDEBAR_STORAGE_KEY = "desktopSidebarOpen";

const globalNavItems: NavItem[] = [
  { to: ROUTES.DASHBOARD, label: "Bảng điều khiển", icon: FolderKanban },
  { to: ROUTES.PROJECTS, label: "Dự án", icon: FolderKanban },
];

const systemNavItems: NavItem[] = [
  { to: ROUTES.USERS, label: "Người dùng", icon: Users, systemRoles: ["ADMIN"] },
  { to: ROUTES.APPROVALS, label: "Duyệt", icon: ClipboardCheck, systemRoles: ["ADMIN", "STAFF"] },
  { to: ROUTES.AUDIT_LOGS, label: "Nhật ký hệ thống", icon: FileText, systemRoles: ["ADMIN"] },
];

const accountNavItems: NavItem[] = [
  { to: ROUTES.DOCUMENT_SEARCH, label: "Tìm tài liệu", icon: Search },
  { to: ROUTES.SETTINGS_PROFILE, label: "Hồ sơ", icon: UserCircle2 },
  { to: ROUTES.SETTINGS_CHANGE_PASSWORD, label: "Đổi mật khẩu", icon: KeyRound },
];

export function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, toast, clearToast } = useUiStore();
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedSystemRole = user?.systemRole?.toUpperCase?.();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.localStorage.getItem(DESKTOP_SIDEBAR_STORAGE_KEY) !== "false";
  });

  // Call hooks in a fixed order on every render to satisfy Rules of Hooks.
  const projectMatchDeep = useMatch("/projects/:id/*");
  const projectMatchShallow = useMatch("/projects/:id");
  const projectMatch = projectMatchDeep ?? projectMatchShallow;
  const currentProjectId = projectMatch?.params.id ?? "";
  const isProjectContext = Boolean(currentProjectId);

  const { data: currentProject } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: () => getProject(currentProjectId),
    enabled: isProjectContext,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectPermissions, isLoading: isLoadingProjectPermissions } = useProjectPermissions(
    isProjectContext ? currentProjectId : ""
  );

  const projectToolNavItems: NavItem[] = isProjectContext
    ? [
        {
          to: ROUTES.PROJECT_DETAIL(currentProjectId),
          label: "Tổng quan",
          icon: FolderKanban,
          toolId: "PROJECT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_REPORTS(currentProjectId),
          label: "Báo cáo ngày",
          icon: FileText,
          toolId: "DAILY_REPORT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_TASKS(currentProjectId),
          label: "Công việc",
          icon: CheckSquare,
          toolId: "TASK",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_FILES(currentProjectId),
          label: "Tệp đính kèm",
          icon: Files,
          toolId: "FILE",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_DOCUMENTS(currentProjectId),
          label: "Hồ sơ tài liệu",
          icon: FileText,
          toolId: "DOCUMENT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_SAFETY(currentProjectId),
          label: "An toàn",
          icon: ShieldAlert,
          toolId: "SAFETY",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_QUALITY(currentProjectId),
          label: "Chất lượng",
          icon: CheckSquare,
          toolId: "QUALITY",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_WAREHOUSE(currentProjectId),
          label: "Kho vật tư",
          icon: Warehouse,
          toolId: "WAREHOUSE",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_BUDGET(currentProjectId),
          label: "Ngân sách",
          icon: Wallet,
          toolId: "BUDGET",
          minLevel: "READ",
        },
      ]
    : [];

  const projectMgmtNavItems: NavItem[] = isProjectContext
    ? [
        {
          to: ROUTES.PROJECT_MEMBERS(currentProjectId),
          label: "Thành viên",
          icon: Users,
          toolId: "PROJECT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_SETTINGS(currentProjectId),
          label: "Cài đặt dự án",
          icon: Settings,
          toolId: "PROJECT",
          minLevel: "ADMIN",
        },
      ]
    : [];

  // Connect WebSocket and fetch initial data
  useEffect(() => {
    if (!user) return;
    connectSocket();
    void fetchNotifications();
    void fetchUnreadCount();
    return () => disconnectSocket();
  }, [fetchNotifications, fetchUnreadCount, user]);

  useEffect(() => {
    window.localStorage.setItem(
      DESKTOP_SIDEBAR_STORAGE_KEY,
      desktopSidebarOpen ? "true" : "false"
    );
  }, [desktopSidebarOpen]);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAuth();
      navigate(ROUTES.LOGIN);
    }
  };

  const hasSystemAccess = (item: NavItem) => {
    if (!item.systemRoles || item.systemRoles.length === 0) {
      return true;
    }
    if (!normalizedSystemRole) {
      return false;
    }
    return item.systemRoles.includes(normalizedSystemRole as SystemRole);
  };

  const hasToolAccess = (item: NavItem) => {
    if (!item.toolId) {
      return true;
    }
    if (!isProjectContext) {
      return false;
    }
    if (isLoadingProjectPermissions) {
      return false;
    }

    const userLevel = projectPermissions?.toolPermissions?.[item.toolId] ?? "NONE";
    return hasMinPermission(userLevel, item.minLevel ?? "READ");
  };

  const isItemVisible = (item: NavItem) => hasSystemAccess(item) && hasToolAccess(item);

  const visibleGlobalNavItems = globalNavItems.filter(isItemVisible);
  const visibleSystemNavItems = systemNavItems.filter(isItemVisible);
  const visibleAccountNavItems = accountNavItems.filter(isItemVisible);
  const visibleProjectToolNavItems = projectToolNavItems.filter(isItemVisible);
  const visibleProjectMgmtNavItems = projectMgmtNavItems.filter(isItemVisible);

  const isActiveLink = (to: string) => {
    if (isProjectContext && to === ROUTES.PROJECT_DETAIL(currentProjectId)) {
      return location.pathname === to;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isActiveLink(item.to);

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
  };

  return (
    <div
      className={`relative flex min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 ${
        desktopSidebarOpen ? "lg:pl-72" : ""
      }`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          desktopSidebarOpen ? "lg:translate-x-0" : "lg:-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900">Xay Dung</p>
              <p className="text-xs text-slate-500">Construction Console</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Đóng sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="h-[calc(100vh-4rem)] space-y-5 overflow-y-auto p-4 pb-36">
          <NavSection label="Chung" items={visibleGlobalNavItems} renderNavItem={renderNavItem} />
          <NavSection label="Hệ thống" items={visibleSystemNavItems} renderNavItem={renderNavItem} />

          {isProjectContext && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dự án hiện tại</p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {currentProject?.name ?? `Dự án ${currentProjectId.slice(0, 8)}`}
                </p>
              </div>

              {isLoadingProjectPermissions ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang tải quyền dự án...
                </div>
              ) : (
                <>
                  <NavSection label="Công cụ dự án" items={visibleProjectToolNavItems} renderNavItem={renderNavItem} />
                  <NavSection label="Quản lý dự án" items={visibleProjectMgmtNavItems} renderNavItem={renderNavItem} />
                </>
              )}
            </>
          )}

          <NavSection label="Tài khoản" items={visibleAccountNavItems} renderNavItem={renderNavItem} />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Mở sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setDesktopSidebarOpen((value) => !value)}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
              aria-label={desktopSidebarOpen ? "Ẩn sidebar" : "Mở sidebar"}
            >
              {desktopSidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
            <div className="hidden text-sm text-slate-500 sm:block">
              Chào mừng, {user?.name?.split(" ").slice(-1)[0]}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto w-full min-w-0 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {sidebarOpen && <div onClick={toggleSidebar} className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" />}

      {toast && (
        <div className="toast-enter fixed right-4 top-4 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className={`text-sm font-semibold ${
                  toast.type === "error"
                    ? "text-red-700"
                    : toast.type === "success"
                      ? "text-emerald-700"
                      : "text-slate-700"
                }`}
              >
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

function NavSection({
  label,
  items,
  renderNavItem,
}: {
  label: string;
  items: NavItem[];
  renderNavItem: (item: NavItem) => React.ReactNode;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="space-y-1">{items.map((item) => renderNavItem(item))}</div>
    </div>
  );
}




import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
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
import { useNotificationStore, selectUnreadCount } from "../../../store/notificationStore";
import { useUiStore } from "../../../store/uiStore";
import { connectSocket, disconnectSocket } from "../../../socket/socketClient";

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
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: FolderKanban },
  { to: ROUTES.PROJECTS, label: "Du an", icon: FolderKanban },
];

const systemNavItems: NavItem[] = [
  { to: ROUTES.USERS, label: "Nguoi dung", icon: Users, systemRoles: ["ADMIN"] },
  { to: ROUTES.APPROVALS, label: "Duyet", icon: ClipboardCheck, systemRoles: ["ADMIN", "STAFF"] },
  { to: ROUTES.AUDIT_LOGS, label: "Audit logs", icon: FileText, systemRoles: ["ADMIN"] },
];

const accountNavItems: NavItem[] = [
  { to: ROUTES.DOCUMENT_SEARCH, label: "Tim tai lieu", icon: Search },
  { to: ROUTES.SETTINGS, label: "Cai dat", icon: Settings },
  { to: ROUTES.SETTINGS_PROFILE, label: "Ho so", icon: UserCircle2 },
  { to: ROUTES.SETTINGS_CHANGE_PASSWORD, label: "Doi mat khau", icon: KeyRound },
];

export function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, toast, clearToast } = useUiStore();
  const unreadCount = useNotificationStore(selectUnreadCount);
  const { panelOpen, setPanelOpen, markAllAsRead, fetchNotifications } = useNotificationStore();
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
          label: "Tong quan",
          icon: FolderKanban,
          toolId: "PROJECT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_REPORTS(currentProjectId),
          label: "Bao cao ngay",
          icon: FileText,
          toolId: "DAILY_REPORT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_TASKS(currentProjectId),
          label: "Task",
          icon: CheckSquare,
          toolId: "TASK",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_FILES(currentProjectId),
          label: "Files",
          icon: Files,
          toolId: "FILE",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_DOCUMENTS(currentProjectId),
          label: "Tai lieu",
          icon: FileText,
          toolId: "DOCUMENT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_SAFETY(currentProjectId),
          label: "An toan",
          icon: ShieldAlert,
          toolId: "SAFETY",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_QUALITY(currentProjectId),
          label: "Chat luong",
          icon: CheckSquare,
          toolId: "QUALITY",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_WAREHOUSE(currentProjectId),
          label: "Kho vat tu",
          icon: Warehouse,
          toolId: "WAREHOUSE",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_BUDGET(currentProjectId),
          label: "Ngan sach",
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
          label: "Thanh vien",
          icon: Users,
          toolId: "PROJECT",
          minLevel: "READ",
        },
        {
          to: ROUTES.PROJECT_SETTINGS(currentProjectId),
          label: "Cai dat du an",
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
    fetchNotifications();
    useNotificationStore.getState().fetchUnreadCount();
    return () => disconnectSocket();
  }, [user, fetchNotifications]);

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
            aria-label="Dong sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="h-[calc(100vh-4rem)] space-y-5 overflow-y-auto p-4 pb-36">
          <NavSection label="Chung" items={visibleGlobalNavItems} renderNavItem={renderNavItem} />
          <NavSection label="He thong" items={visibleSystemNavItems} renderNavItem={renderNavItem} />

          {isProjectContext && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Du an hien tai</p>
                <p className="truncate text-sm font-medium text-slate-800">
                  {currentProject?.name ?? `Project ${currentProjectId.slice(0, 8)}`}
                </p>
              </div>

              {isLoadingProjectPermissions ? (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Dang tai quyen du an...
                </div>
              ) : (
                <>
                  <NavSection label="Cong cu du an" items={visibleProjectToolNavItems} renderNavItem={renderNavItem} />
                  <NavSection label="Quan ly du an" items={visibleProjectMgmtNavItems} renderNavItem={renderNavItem} />
                </>
              )}
            </>
          )}

          <NavSection label="Tai khoan" items={visibleAccountNavItems} renderNavItem={renderNavItem} />
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
            Dang xuat
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Mo sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setDesktopSidebarOpen((value) => !value)}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:inline-flex"
              aria-label={desktopSidebarOpen ? "An sidebar" : "Mo sidebar"}
            >
              {desktopSidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
            <div className="hidden text-sm text-slate-500 sm:block">
              Chao mung, {user?.name?.split(" ").slice(-1)[0]}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="relative rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Thong bao"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto w-full min-w-0 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {sidebarOpen && <div onClick={toggleSidebar} className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" />}

      {panelOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setPanelOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm animate-[slide-in-right_200ms_ease-out] border-l border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
              <h2 className="text-base font-semibold text-slate-900">Thong bao</h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-brand-600 hover:text-brand-700">
                    Danh dau da doc
                  </button>
                )}
                <button onClick={() => setPanelOpen(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <NotificationList />
          </div>
        </div>
      )}

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
            <button onClick={clearToast} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Dong thong bao">
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

function NotificationList() {
  const { notifications, markAsRead, setPanelOpen, initialized } = useNotificationStore();
  const navigate = useNavigate();

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        <p className="mt-3 text-sm text-slate-400">Dang tai thong bao...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-12 w-12 text-slate-200" />
        <p className="mt-3 text-sm font-medium text-slate-500">Khong co thong bao nao</p>
        <p className="mt-1 text-xs text-slate-400">Ban se nhan thong bao khi co cap nhat moi</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto" style={{ height: "calc(100vh - 4rem)" }}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => {
            if (!notification.isRead) {
              markAsRead(notification.id);
            }
            if (notification.link) {
              navigate(notification.link);
              setPanelOpen(false);
            }
          }}
          className={`flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 ${
            !notification.isRead ? "bg-brand-50/40" : ""
          }`}
        >
          <div
            className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
              notification.type === "ERROR"
                ? "bg-red-500"
                : notification.type === "SUCCESS"
                  ? "bg-emerald-500"
                  : notification.type === "WARNING"
                    ? "bg-amber-500"
                    : "bg-brand-500"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${!notification.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
              {notification.title}
            </p>
            {notification.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notification.message}</p>}
            <p className="mt-1 text-[10px] text-slate-400">{new Date(notification.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          {!notification.isRead && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />}
        </div>
      ))}
    </div>
  );
}

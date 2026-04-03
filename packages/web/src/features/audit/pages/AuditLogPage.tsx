import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Filter, X, LogIn, LogOut, Plus, Pencil, Trash2, RefreshCw,
} from "lucide-react";
import { listAuditLogs } from "../api/auditApi";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import type { AuditAction, AuditEntityType, AuditLog } from "@construction/shared";

const ACTION_ICONS: Record<AuditAction, React.ElementType> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
  STATUS_CHANGE: RefreshCw,
};

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  STATUS_CHANGE: "Đổi trạng thái",
};

const ACTION_COLORS: Record<AuditAction, string> = {
  LOGIN: "bg-emerald-50 text-emerald-700",
  LOGOUT: "bg-slate-100 text-slate-600",
  CREATE: "bg-brand-50 text-brand-700",
  UPDATE: "bg-amber-50 text-amber-700",
  DELETE: "bg-red-50 text-red-600",
  STATUS_CHANGE: "bg-violet-50 text-violet-700",
};

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  USER: "Người dùng",
  PROJECT: "Dự án",
  PROJECT_MEMBER: "Thành viên",
  PROJECT_TOOL_PERMISSION: "Quyền công cụ",
  SPECIAL_PRIVILEGE_ASSIGNMENT: "Đặc quyền",
  DAILY_REPORT: "Báo cáo ngày",
  TASK: "Task",
  FILE: "File",
};

function LogRow({ log }: { log: AuditLog }) {
  const Icon = ACTION_ICONS[log.action] ?? RefreshCw;
  const actionColor = ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600";

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${actionColor}`}>
          <Icon className="h-3 w-3" />
          {ACTION_LABELS[log.action] ?? log.action}
        </span>
      </td>
      <td className="py-3 pr-3">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {ENTITY_LABELS[log.entityType] ?? log.entityType}
        </span>
      </td>
      <td className="py-3 pr-3">
        {log.user ? (
          <div>
            <p className="text-sm font-medium text-slate-900">{log.user.name}</p>
            <p className="text-xs text-slate-500">{log.user.email}</p>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="py-3 pr-3">
        <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">{log.description}</p>
      </td>
      <td className="py-3 text-right">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-slate-500">
            {new Date(log.createdAt).toLocaleDateString("vi-VN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(log.createdAt).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </td>
    </tr>
  );
}

export function AuditLogPage() {
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState<AuditAction | "">("");
  const [entityFilter, setEntityFilter] = useState<AuditEntityType | "">("");
  const [userFilter, setUserFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, entityFilter, userFilter, fromDate, toDate],
    queryFn: () =>
      listAuditLogs({
        page,
        pageSize,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        user_id: userFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  });

  const hasFilters = actionFilter || entityFilter || userFilter || fromDate || toDate;

  const clearFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setUserFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const logs = data?.logs ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const ACTIONS: AuditAction[] = ["LOGIN", "LOGOUT", "CREATE", "UPDATE", "DELETE", "STATUS_CHANGE"];
  const ENTITIES: AuditEntityType[] = ["USER", "PROJECT", "PROJECT_MEMBER", "DAILY_REPORT", "TASK", "FILE"];

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h1>Nhật ký hoạt động</h1>
          <p className="page-subtitle">Theo dõi lịch sử thao tác để đảm bảo kiểm soát và truy vết.</p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition ${
            showFilters || hasFilters
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Filter className="h-4 w-4" />
          Lọc
          {hasFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs text-white">
              {(actionFilter ? 1 : 0) + (entityFilter ? 1 : 0) + (userFilter ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="app-card animate-in slide-in-from-top-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Bộ lọc</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
                Xóa lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="form-label text-xs">Thao tác</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value as AuditAction | ""); setPage(1); }}
                className="form-input"
              >
                <option value="">Tất cả thao tác</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{ACTION_LABELS[a]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-xs">Đối tượng</label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value as AuditEntityType | ""); setPage(1); }}
                className="form-input"
              >
                <option value="">Tất cả đối tượng</option>
                {ENTITIES.map((e) => (
                  <option key={e} value={e}>{ENTITY_LABELS[e]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label text-xs">Từ ngày</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label text-xs">Đến ngày</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="form-input"
              />
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} lines={1} />)}
        </div>
      )}

      {isError && <ErrorState message="Không thể tải nhật ký hoạt động. Vui lòng thử lại." />}

      {!isLoading && !isError && logs.length === 0 && (
        <EmptyState
          title="Không có log nào"
          description={
            hasFilters
              ? "Thử thay đổi bộ lọc để xem kết quả khác."
              : "Nhật ký thao tác sẽ hiển thị khi có hoạt động từ người dùng hệ thống."
          }
          action={
            hasFilters ? (
              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Xóa bộ lọc
              </button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && logs.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-medium text-slate-500">Thao tác</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Đối tượng</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Người thực hiện</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Chi tiết</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Hiển thị {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, meta.total)} trong tổng {meta.total} log
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >
                  ← Trước
                </button>
                <span className="px-2 text-sm text-slate-500">
                  Trang {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

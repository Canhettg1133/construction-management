import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Filter, X, CloudRain, Sun, Cloud, HelpCircle } from "lucide-react";
import { listReports } from "../api/reportApi";
import { listProjectMembers } from "../../projects/api/memberApi";
import { EmptyState } from "../../../shared/components/feedback/EmptyState";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { useAuthStore } from "../../../store/authStore";

const WEATHER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SUNNY: Sun,
  RAINY: CloudRain,
  CLOUDY: Cloud,
  OTHER: HelpCircle,
};

const WEATHER_LABELS: Record<string, string> = {
  SUNNY: "Nắng",
  RAINY: "Mưa",
  CLOUDY: "Nhiều mây",
  OTHER: "Khác",
};

export function ReportListPage() {
  const { user } = useAuthStore();
  const { id: projectId } = useParams();
  const canCreateReport = user?.role !== "VIEWER";

  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [creatorId, setCreatorId] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", projectId, page, fromDate, toDate, creatorId],
    queryFn: () =>
      listReports(String(projectId), {
        page,
        pageSize: 10,
        from: fromDate || undefined,
        to: toDate || undefined,
        created_by: creatorId || undefined,
      }),
    enabled: !!projectId,
  });

  const { data: members } = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => listProjectMembers(String(projectId)),
    enabled: !!projectId,
  });

  const hasFilters = fromDate || toDate || creatorId;

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setCreatorId("");
    setPage(1);
  };

  const reports = data?.reports ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>Báo cáo ngày</h2>
          <p className="page-subtitle">Theo dõi nhật ký thi công và tiến độ theo ngày.</p>
        </div>
        <div className="flex items-center gap-2">
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
                {(fromDate ? 1 : 0) + (toDate ? 1 : 0) + (creatorId ? 1 : 0)}
              </span>
            )}
          </button>
          {canCreateReport && projectId && (
            <Link
              to={`/projects/${projectId}/reports/new`}
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 sm:w-auto"
            >
              Tạo báo cáo
            </Link>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="app-card space-y-3">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            <div>
              <label className="form-label text-xs">Người tạo</label>
              <select
                value={creatorId}
                onChange={(e) => { setCreatorId(e.target.value); setPage(1); }}
                className="form-input"
              >
                <option value="">Tất cả</option>
                {(members ?? []).map((m) =>
                  m.user ? (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ) : null
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      )}

      {isError && <ErrorState message="Không tải được báo cáo. Vui lòng thử lại sau vài giây." />}

      {!isLoading && !isError && reports.length === 0 && (
        <EmptyState
          title="Không có báo cáo nào"
          description={
            hasFilters
              ? "Thử thay đổi bộ lọc để xem kết quả khác."
              : canCreateReport
              ? "Bắt đầu bằng cách tạo báo cáo ngày đầu tiên."
              : "Hiện chưa có báo cáo nào cho dự án này."
          }
          action={
            canCreateReport && !hasFilters ? (
              <Link
                to={`/projects/${projectId}/reports/new`}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
              >
                Tạo báo cáo
              </Link>
            ) : hasFilters ? (
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

      {!isLoading && !isError && reports.length > 0 && (
        <>
          <div className="space-y-3">
            {reports.map((report) => {
              const WeatherIcon = WEATHER_ICONS[report.weather] ?? HelpCircle;
              return (
                <Link
                  key={report.id}
                  to={`/projects/${projectId}/reports/${report.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-800">
                          {new Date(report.reportDate).toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <WeatherIcon className="h-3 w-3" />
                          {WEATHER_LABELS[report.weather] ?? report.weather}
                        </span>
                        <span>·</span>
                        <span>{report.workerCount} công nhân</span>
                        {report.creator && (
                          <>
                            <span>·</span>
                            <span>{report.creator.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        {report.progress}%
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        report.status === "SENT"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {report.status === "SENT" ? "Đã gửi" : "Nháp"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                ← Trước
              </button>
              <span className="px-3 text-sm text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
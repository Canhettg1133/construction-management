import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, PenSquare } from "lucide-react";
import { safetyApi } from "../api/safetyApi";
import { SafetyChecklist } from "../components/SafetyChecklist";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { useUiStore } from "../../../store/uiStore";
import { usePermission } from "../../../shared/hooks/usePermission";

function SafetyStatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | string }) {
  const className =
    status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  const label =
    status === "APPROVED" ? "Đã ký" : status === "REJECTED" ? "Từ chối" : "Chờ ký";

  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

export function SafetyDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const { has: canCreateReport } = usePermission({
    projectId,
    toolId: "SAFETY",
    minLevel: "STANDARD",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["safety-reports", projectId],
    queryFn: () => safetyApi.list(projectId),
    enabled: Boolean(projectId),
  });

  const signMutation = useMutation({
    mutationFn: (reportId: string) => safetyApi.sign(projectId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-reports", projectId] });
      showToast({ type: "success", title: "Đã ký duyệt báo cáo an toàn" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Lỗi",
        description: error instanceof Error ? error.message : "Không thể ký duyệt báo cáo",
      });
    },
  });

  const pendingReports = useMemo(
    () => (data?.reports ?? []).filter((report) => report.status === "PENDING"),
    [data?.reports]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="Không tải được dữ liệu an toàn lao động." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>An toàn lao động</h2>
          <p className="page-subtitle">Tổng hợp báo cáo vi phạm và tình trạng ký duyệt an toàn.</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate projectId={projectId} toolId="SAFETY" minLevel="STANDARD">
            <Link
              to={`/projects/${projectId}/safety/new`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Tạo báo cáo
            </Link>
          </PermissionGate>
          <SpecialPrivilegeGate projectId={projectId} privilege="SAFETY_SIGNER">
            <button
              disabled={pendingReports.length === 0 || signMutation.isPending}
              onClick={() => {
                const target = pendingReports[0];
                if (target) signMutation.mutate(target.id);
              }}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ký duyệt nhanh
            </button>
          </SpecialPrivilegeGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="app-card">
          <p className="text-xs text-slate-500">Tổng báo cáo</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data.summary.total}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Tổng vi phạm</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{data.summary.violations}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Cho ký duyệt</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{data.summary.pending}</p>
        </div>
      </div>

      <div className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h3>Báo cáo gần đây</h3>
          <span className="text-xs text-slate-500">{data.reports.length} báo cáo</span>
        </div>

        {data.reports.length === 0 ? (
          <p className="text-sm text-slate-500">
            {canCreateReport ? "Chưa có báo cáo nào. Hãy tạo báo cáo đầu tiên." : "Chưa có báo cáo nào."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Ngày</th>
                  <th className="px-2 py-2">Vị trí</th>
                  <th className="px-2 py-2">Người kiểm tra</th>
                  <th className="px-2 py-2">Vi phạm</th>
                  <th className="px-2 py-2">Trạng thái</th>
                  <th className="px-2 py-2 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr key={report.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2">
                      <Link
                        to={`/projects/${projectId}/safety/${report.id}`}
                        className="font-medium text-brand-700 hover:text-brand-800"
                      >
                        {new Date(report.reportDate).toLocaleDateString("vi-VN")}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-slate-700">{report.location}</td>
                    <td className="px-2 py-2 text-slate-600">
                      {report.inspector?.name ?? report.inspectorId}
                    </td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <AlertTriangle className="h-3 w-3" />
                        {report.violations}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <SafetyStatusBadge status={report.status} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/projects/${projectId}/safety/${report.id}`}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Chi tiết
                        </Link>
                        {report.status === "PENDING" && (
                          <SpecialPrivilegeGate projectId={projectId} privilege="SAFETY_SIGNER">
                            <button
                              onClick={() => signMutation.mutate(report.id)}
                              disabled={signMutation.isPending}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Ký
                            </button>
                          </SpecialPrivilegeGate>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SafetyChecklist />

        <div className="app-card space-y-3">
          <h3>Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2">
            <PermissionGate projectId={projectId} toolId="SAFETY" minLevel="STANDARD">
              <Link
                to={`/projects/${projectId}/safety/new`}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <PenSquare className="h-4 w-4 text-brand-600" />
                Tạo báo cáo an toàn
              </Link>
            </PermissionGate>

            <SpecialPrivilegeGate projectId={projectId} privilege="SAFETY_SIGNER">
              <button
                disabled={pendingReports.length === 0 || signMutation.isPending}
                onClick={() => {
                  const target = pendingReports[0];
                  if (target) signMutation.mutate(target.id);
                }}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ClipboardCheck className="h-4 w-4" />
                Ký duyệt báo cáo cho
              </button>
            </SpecialPrivilegeGate>
          </div>
        </div>
      </div>
    </div>
  );
}





import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ClipboardCheck, PenSquare } from "lucide-react";
import { qualityApi } from "../api/qualityApi";
import { QualityChecklist } from "../components/QualityChecklist";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { useUiStore } from "../../../store/uiStore";
import { usePermission } from "../../../shared/hooks/usePermission";

function QualityStatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" | string }) {
  const className =
    status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700"
      : status === "REJECTED"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";
  const label =
    status === "APPROVED" ? "Da nghiem thu" : status === "REJECTED" ? "Tu choi" : "Cho nghiem thu";

  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

export function QualityDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const { has: canCreateReport } = usePermission({
    projectId,
    toolId: "QUALITY",
    minLevel: "STANDARD",
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quality-reports", projectId],
    queryFn: () => qualityApi.list(projectId),
    enabled: Boolean(projectId),
  });

  const signMutation = useMutation({
    mutationFn: (reportId: string) => qualityApi.sign(projectId, reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-reports", projectId] });
      showToast({ type: "success", title: "Da ky nghiem thu bao cao QC" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the ky nghiem thu",
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
    return <ErrorState message="Khong tai duoc du lieu chat luong." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>Quan ly chat luong</h2>
          <p className="page-subtitle">Tong hop bao cao QC, pass rate va nghiem thu.</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate projectId={projectId} toolId="QUALITY" minLevel="STANDARD">
            <Link
              to={`/projects/${projectId}/quality/new`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Tao bao cao QC
            </Link>
          </PermissionGate>
          <SpecialPrivilegeGate projectId={projectId} privilege="QUALITY_SIGNER">
            <button
              disabled={pendingReports.length === 0 || signMutation.isPending}
              onClick={() => {
                const target = pendingReports[0];
                if (target) signMutation.mutate(target.id);
              }}
              className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ky nghiem thu nhanh
            </button>
          </SpecialPrivilegeGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="app-card">
          <p className="text-xs text-slate-500">Tong bao cao QC</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data.summary.total}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">QC pass rate</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{data.summary.passRate}%</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Cho nghiem thu</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{data.summary.pending}</p>
        </div>
      </div>

      <div className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h3>Bao cao gan day</h3>
          <span className="text-xs text-slate-500">{data.reports.length} bao cao</span>
        </div>

        {data.reports.length === 0 ? (
          <p className="text-sm text-slate-500">
            {canCreateReport ? "Chua co bao cao QC. Hay tao bao cao dau tien." : "Chua co bao cao QC nao."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Ngay</th>
                  <th className="px-2 py-2">Vi tri</th>
                  <th className="px-2 py-2">Nguoi lap</th>
                  <th className="px-2 py-2">Trang thai</th>
                  <th className="px-2 py-2 text-right">Tac vu</th>
                </tr>
              </thead>
              <tbody>
                {data.reports.map((report) => (
                  <tr key={report.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2">
                      <Link
                        to={`/projects/${projectId}/quality/${report.id}`}
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
                      <QualityStatusBadge status={report.status} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/projects/${projectId}/quality/${report.id}`}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Chi tiet
                        </Link>
                        {report.status === "PENDING" && (
                          <SpecialPrivilegeGate projectId={projectId} privilege="QUALITY_SIGNER">
                            <button
                              onClick={() => signMutation.mutate(report.id)}
                              disabled={signMutation.isPending}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Ky
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
        <QualityChecklist />

        <div className="app-card space-y-3">
          <h3>Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2">
            <PermissionGate projectId={projectId} toolId="QUALITY" minLevel="STANDARD">
              <Link
                to={`/projects/${projectId}/quality/new`}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <PenSquare className="h-4 w-4 text-brand-600" />
                Tao bao cao QC
              </Link>
            </PermissionGate>

            <SpecialPrivilegeGate projectId={projectId} privilege="QUALITY_SIGNER">
              <button
                disabled={pendingReports.length === 0 || signMutation.isPending}
                onClick={() => {
                  const target = pendingReports[0];
                  if (target) signMutation.mutate(target.id);
                }}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ClipboardCheck className="h-4 w-4" />
                Ky nghiem thu bao cao cho
              </button>
            </SpecialPrivilegeGate>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <BadgeCheck className="h-4 w-4 text-brand-600" />
                Quy tac QC
              </span>
              <p className="mt-1 text-xs text-slate-500">
                Bao cao chi duoc nghiem thu khi day du thong tin va trang thai PENDING.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

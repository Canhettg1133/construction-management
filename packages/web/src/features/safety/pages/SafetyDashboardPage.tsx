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
    status === "APPROVED" ? "Da ky" : status === "REJECTED" ? "Tu choi" : "Cho ky";

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
      showToast({ type: "success", title: "Da ky duyet bao cao an toan" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the ky duyet bao cao",
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
    return <ErrorState message="Khong tai duoc du lieu an toan lao dong." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>An toan lao dong</h2>
          <p className="page-subtitle">Tong hop bao cao vi pham va tinh trang ky duyet an toan.</p>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate projectId={projectId} toolId="SAFETY" minLevel="STANDARD">
            <Link
              to={`/projects/${projectId}/safety/new`}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
            >
              Tao bao cao
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
              Ky duyet nhanh
            </button>
          </SpecialPrivilegeGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="app-card">
          <p className="text-xs text-slate-500">Tong bao cao</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{data.summary.total}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Tong vi pham</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{data.summary.violations}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Cho ky duyet</p>
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
            {canCreateReport ? "Chua co bao cao nao. Hay tao bao cao dau tien." : "Chua co bao cao nao."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Ngay</th>
                  <th className="px-2 py-2">Vi tri</th>
                  <th className="px-2 py-2">Nguoi kiem tra</th>
                  <th className="px-2 py-2">Vi pham</th>
                  <th className="px-2 py-2">Trang thai</th>
                  <th className="px-2 py-2 text-right">Tac vu</th>
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
                          Chi tiet
                        </Link>
                        {report.status === "PENDING" && (
                          <SpecialPrivilegeGate projectId={projectId} privilege="SAFETY_SIGNER">
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
                Tao bao cao an toan
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
                Ky duyet bao cao cho
              </button>
            </SpecialPrivilegeGate>
          </div>
        </div>
      </div>
    </div>
  );
}

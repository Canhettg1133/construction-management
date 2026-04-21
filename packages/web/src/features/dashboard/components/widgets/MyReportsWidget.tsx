import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import type { DailyReport } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

type ReportWithProject = DailyReport & { project?: { id: string; name: string } };

function statusTone(status: string): string {
  if (status === "APPROVED") return "text-emerald-700 bg-emerald-50";
  if (status === "REJECTED") return "text-red-700 bg-red-50";
  if (status === "PENDING") return "text-amber-700 bg-amber-50";
  return "text-slate-700 bg-slate-100";
}

function statusLabel(status: string): string {
  if (status === "APPROVED") return "Đã duyệt";
  if (status === "REJECTED") return "Từ chối";
  if (status === "PENDING") return "Chờ duyệt";
  return status;
}

export function MyReportsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isEngineer) {
    return null;
  }

  const reports = (data?.myReports ?? []) as ReportWithProject[];

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">Báo cáo của tôi</h3>
        </div>
        <span className="text-xs text-slate-500">{reports.length} báo cáo</span>
      </div>

      {reports.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">Bạn chưa tạo báo cáo nào.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {reports.slice(0, 8).map((report) => (
            <div key={report.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-900">{report.project?.name ?? "Dự án"}</p>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusTone(report.approvalStatus)}`}>
                  {statusLabel(report.approvalStatus)}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ngày báo cáo: {new Date(report.reportDate).toLocaleDateString("vi-VN")}
              </div>
            </div>
          ))}
        </div>
      )}

      {reports[0]?.projectId ? (
        <div className="mt-3 border-t border-slate-100 pt-3 text-right">
          <Link
            to={`/projects/${reports[0].projectId}/reports`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Xem báo cáo
          </Link>
        </div>
      ) : null}
    </div>
  );
}

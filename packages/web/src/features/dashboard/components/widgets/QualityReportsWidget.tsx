import { FileCheck2 } from "lucide-react";
import type { QualityReport } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

function statusTone(status: string): string {
  if (status === "APPROVED") return "text-emerald-700 bg-emerald-50";
  if (status === "REJECTED") return "text-red-700 bg-red-50";
  if (status === "PENDING") return "text-amber-700 bg-amber-50";
  return "text-slate-700 bg-slate-100";
}

export function QualityReportsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isQuality && !role.isClient) {
    return null;
  }

  const reports = (data?.qualityReports ?? []) as QualityReport[];

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-slate-700">Bao cao QC gan day</h3>
        </div>
        <span className="text-xs text-slate-500">{reports.length} bao cao</span>
      </div>

      {reports.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">Chua co bao cao QC nao.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {reports.slice(0, 8).map((report) => (
            <div key={report.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-900">{report.location}</p>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusTone(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Ngay bao cao: {new Date(report.reportDate).toLocaleDateString("vi-VN")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


import { ClipboardCheck, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { calculateTrend, formatNumber } from "./utils";

export function QualityStatsWidget() {
  const { data } = useDashboard();
  const qualityStats = data?.qualityStats;
  const pending = data?.pendingQualityApprovals ?? qualityStats?.pendingApprovals ?? 0;
  const passRate = qualityStats?.passRate ?? 0;
  const reportCount = data?.qualityReports?.length ?? qualityStats?.recentReports?.length ?? 0;

  return (
    <div className="app-card space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-brand-600" />
        <h3 className="text-sm font-semibold text-slate-700">Tong quan chat luong</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCell
          icon={FileCheck2}
          title="Bao cao tuan nay"
          value={formatNumber(qualityStats?.thisWeekReports)}
          hint={calculateTrend(qualityStats?.thisWeekReports, qualityStats?.lastWeekReports)}
        />
        <StatCell icon={Clock3} title="Cho nghiem thu" value={formatNumber(pending)} tone="warning" />
        <StatCell icon={CheckCircle2} title="Ty le dat" value={`${passRate.toFixed(1)}%`} tone="success" />
        <StatCell icon={ClipboardCheck} title="Bao cao gan day" value={formatNumber(reportCount)} />
      </div>
    </div>
  );
}

function StatCell({
  icon: Icon,
  title,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-700 bg-amber-50"
      : tone === "danger"
      ? "text-red-700 bg-red-50"
      : tone === "success"
      ? "text-emerald-700 bg-emerald-50"
      : "text-slate-700 bg-slate-50";

  return (
    <div className={`rounded-xl border border-slate-200 p-3 ${toneClass}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{title}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-80">{hint}</p> : null}
    </div>
  );
}


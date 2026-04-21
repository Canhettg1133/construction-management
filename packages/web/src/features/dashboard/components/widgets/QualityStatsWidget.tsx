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
        <h3 className="text-sm font-semibold text-slate-700">Tổng quan chất lượng</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCell
          icon={FileCheck2}
          title="Báo cáo tuần này"
          value={formatNumber(qualityStats?.thisWeekReports)}
          hint={calculateTrend(qualityStats?.thisWeekReports, qualityStats?.lastWeekReports)}
        />
        <StatCell icon={Clock3} title="Chờ nghiệm thu" value={formatNumber(pending)} tone="warning" />
        <StatCell icon={CheckCircle2} title="Tỷ lệ đạt" value={`${passRate.toFixed(1)}%`} tone="success" />
        <StatCell icon={ClipboardCheck} title="Báo cáo gần đây" value={formatNumber(reportCount)} />
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
    <div className={`flex min-h-32 flex-col rounded-xl border border-slate-200 p-3 ${toneClass}`}>
      <div className="flex min-h-12 items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="text-xs font-medium leading-5">{title}</span>
      </div>
      <div className="mt-auto">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-xs opacity-80">{hint}</p> : null}
      </div>
    </div>
  );
}

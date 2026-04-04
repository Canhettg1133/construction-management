import { ShieldAlert, AlertTriangle, ClipboardList, TrendingUp } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";
import { calculateTrend, formatNumber } from "./utils";

export function SafetyStatsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.showSafetyStats) {
    return null;
  }

  const safetyStats = data?.safetyStats;
  const pending = data?.pendingSafetyApprovals ?? safetyStats?.pendingApprovals ?? 0;
  const violations = safetyStats?.totalViolations ?? 0;
  const complianceRate = Math.max(0, 100 - (safetyStats?.violationRate ?? 0));

  return (
    <div className="app-card space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-700">Tong quan an toan</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCell
          icon={ClipboardList}
          title="Bao cao tuan nay"
          value={formatNumber(safetyStats?.thisWeekReports)}
          hint={calculateTrend(safetyStats?.thisWeekReports, safetyStats?.lastWeekReports)}
        />
        <StatCell icon={TrendingUp} title="Cho duyet" value={formatNumber(pending)} tone="warning" />
        <StatCell icon={AlertTriangle} title="Vi pham" value={formatNumber(violations)} tone={violations > 0 ? "danger" : "success"} />
        <StatCell icon={ShieldAlert} title="Ty le tuan thu" value={`${complianceRate.toFixed(1)}%`} tone="success" />
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


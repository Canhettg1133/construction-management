import { ClipboardCheck } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

export function PendingSafetyApprovalsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isSafety) {
    return null;
  }

  const pending = data?.pendingSafetyApprovals ?? data?.safetyStats?.pendingApprovals ?? 0;

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-700">Báo cáo an toàn chờ duyệt</h3>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs uppercase tracking-wide text-amber-700">Đang chờ xử lý</p>
        <p className="mt-1 text-3xl font-bold text-amber-800">{pending}</p>
        <p className="mt-1 text-xs text-amber-700">Cần xử lý để bảo đảm tuân thủ an toàn công trường.</p>
      </div>
    </div>
  );
}

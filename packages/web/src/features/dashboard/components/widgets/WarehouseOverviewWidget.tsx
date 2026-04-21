import { Warehouse, AlertTriangle, TrendingUp } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";
import { formatNumber } from "./utils";

export function WarehouseOverviewWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isQuality) {
    return null;
  }

  const stats = data?.warehouseStats;

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <Warehouse className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-700">Tổng quan kho phục vụ QC</h3>
      </div>

      <div className="space-y-2">
        <Row label="Vật tư tồn kho" value={formatNumber(stats?.totalItems)} icon={Warehouse} />
        <Row label="Cảnh báo tồn thấp" value={formatNumber(stats?.lowStockCount)} icon={AlertTriangle} />
        <Row label="Nhập kho tháng này" value={formatNumber(stats?.thisMonthIn)} icon={TrendingUp} />
        <Row label="Xuất kho tháng này" value={formatNumber(stats?.thisMonthOut)} icon={TrendingUp} />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

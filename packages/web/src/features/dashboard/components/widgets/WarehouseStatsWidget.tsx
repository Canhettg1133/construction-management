import { Boxes, AlertTriangle, ClipboardList, CircleDollarSign } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";
import { formatCurrency, formatNumber } from "./utils";

export function WarehouseStatsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.showWarehouseStats) {
    return null;
  }

  const stats = data?.warehouseStats;
  const lowStock = stats?.lowStockCount ?? 0;
  const pendingTransactions = data?.pendingTransactions ?? stats?.pendingRequests ?? 0;

  return (
    <div className="app-card space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-700">Tong quan kho vat tu</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCell icon={Boxes} title="Vat tu trong kho" value={formatNumber(stats?.totalItems)} />
        <StatCell icon={AlertTriangle} title="Canh bao ton thap" value={formatNumber(lowStock)} tone={lowStock > 0 ? "warning" : "success"} />
        <StatCell icon={ClipboardList} title="Cho duyet yeu cau" value={formatNumber(pendingTransactions)} tone="warning" />
        <StatCell icon={CircleDollarSign} title="Gia tri ton kho" value={formatCurrency(stats?.totalValue)} />
      </div>
    </div>
  );
}

function StatCell({
  icon: Icon,
  title,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
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
    </div>
  );
}


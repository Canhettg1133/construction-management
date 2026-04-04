import { ClipboardList } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

export function PendingTransactionsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isWarehouse) {
    return null;
  }

  const pendingCount = data?.pendingTransactions ?? 0;

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-slate-700">Yeu cau cho xu ly</h3>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs uppercase tracking-wide text-amber-700">Dang cho duyet</p>
        <p className="mt-1 text-3xl font-bold text-amber-800">{pendingCount}</p>
        <p className="mt-1 text-xs text-amber-700">Bao gom nhap, xuat va request vat tu.</p>
      </div>
    </div>
  );
}


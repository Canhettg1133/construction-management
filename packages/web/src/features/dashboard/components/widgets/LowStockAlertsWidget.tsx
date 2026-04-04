import { AlertTriangle } from "lucide-react";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

function toNumber(value: number | string | null | undefined): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function LowStockAlertsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();
  const items = data?.lowStockItems ?? [];

  if (!(role.isAdmin || role.isPM || role.isQuality || role.isWarehouse)) {
    return null;
  }

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-slate-700">Canh bao ton kho thap</h3>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">Khong co vat tu duoi nguong ton.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {items.slice(0, 8).map((item) => {
            const quantity = toNumber(item.quantity);
            const min = toNumber(item.minQuantity);
            const ratio = min > 0 ? Math.max(0, Math.min(100, (quantity / min) * 100)) : 0;

            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{item.materialName}</p>
                    <p className="truncate text-xs text-slate-500">{item.location ?? "Kho chinh"}</p>
                  </div>
                  <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                    {quantity} / {min} {item.unit}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-red-500" style={{ width: `${ratio}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


import { ArrowDownUp } from "lucide-react";
import type { WarehouseTransaction } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

function statusTone(status: string): string {
  if (status === "APPROVED") return "text-emerald-700 bg-emerald-50";
  if (status === "REJECTED") return "text-red-700 bg-red-50";
  if (status === "PENDING") return "text-amber-700 bg-amber-50";
  return "text-slate-700 bg-slate-100";
}

function typeLabel(type: string): string {
  if (type === "IN") return "Nhap";
  if (type === "OUT") return "Xuat";
  if (type === "REQUEST") return "Request";
  return type;
}

function toNumber(value: number | string | null | undefined): number {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function RecentTransactionsWidget() {
  const role = useDashboardRole();
  const { data } = useDashboard();

  if (!role.isWarehouse) {
    return null;
  }

  const transactions = (data?.recentTransactions ?? []) as WarehouseTransaction[];

  return (
    <div className="app-card">
      <div className="mb-3 flex items-center gap-2">
        <ArrowDownUp className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-700">Giao dich gan day</h3>
      </div>

      {transactions.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">Chua co giao dich nao gan day.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {transactions.slice(0, 8).map((transaction) => (
            <div key={transaction.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-900">
                  {transaction.inventory?.materialName ?? "Vat tu"}
                </p>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusTone(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {typeLabel(transaction.type)}: {toNumber(transaction.quantity).toLocaleString("vi-VN")}{" "}
                  {transaction.inventory?.unit ?? ""}
                </span>
                <span>{new Date(transaction.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


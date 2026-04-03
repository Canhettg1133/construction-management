import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetApi } from "../api/budgetApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { useUiStore } from "../../../store/uiStore";

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

export function BudgetOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);

  const [showItemForm, setShowItemForm] = useState(false);
  const [showDisbursementForm, setShowDisbursementForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    category: "",
    description: "",
    estimatedCost: "",
    approvedCost: "",
  });
  const [disbursementForm, setDisbursementForm] = useState({
    budgetItemId: "",
    amount: "",
    note: "",
  });

  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useQuery({
    queryKey: ["budget-overview", projectId],
    queryFn: () => budgetApi.getOverview(projectId),
    enabled: Boolean(projectId),
  });

  const { data: itemsData, isLoading: itemsLoading, isError: itemsError } = useQuery({
    queryKey: ["budget-items", projectId],
    queryFn: () => budgetApi.listItems(projectId),
    enabled: Boolean(projectId),
  });

  const createItemMutation = useMutation({
    mutationFn: () =>
      budgetApi.createItem(projectId, {
        category: itemForm.category,
        description: itemForm.description,
        estimatedCost: Number(itemForm.estimatedCost),
        approvedCost: itemForm.approvedCost ? Number(itemForm.approvedCost) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-overview", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] });
      showToast({ type: "success", title: "Da tao hang muc ngan sach" });
      setItemForm({ category: "", description: "", estimatedCost: "", approvedCost: "" });
      setShowItemForm(false);
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the tao hang muc",
      });
    },
  });

  const createDisbursementMutation = useMutation({
    mutationFn: () =>
      budgetApi.createDisbursement(projectId, {
        budgetItemId: disbursementForm.budgetItemId,
        amount: Number(disbursementForm.amount),
        note: disbursementForm.note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-overview", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] });
      showToast({ type: "success", title: "Da tao phieu giai ngan" });
      setDisbursementForm({ budgetItemId: "", amount: "", note: "" });
      setShowDisbursementForm(false);
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the tao giai ngan",
      });
    },
  });

  const pendingDisbursementCount = useMemo(
    () =>
      (itemsData?.items ?? []).flatMap((item) => item.disbursements ?? []).filter((disbursement) => disbursement.status === "PENDING")
        .length,
    [itemsData?.items]
  );

  if (overviewLoading || itemsLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (overviewError || itemsError || !overview || !itemsData) {
    return <ErrorState message="Khong tai duoc du lieu ngan sach." />;
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>Ngan sach du an</h2>
          <p className="page-subtitle">Tong quan du toan, chi tieu va quan ly giai ngan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate projectId={projectId} toolId="BUDGET" minLevel="ADMIN">
            <button
              onClick={() => setShowItemForm((value) => !value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Them hang muc
            </button>
          </PermissionGate>

          <PermissionGate projectId={projectId} toolId="BUDGET" minLevel="ADMIN">
            <button
              onClick={() => setShowDisbursementForm((value) => !value)}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Tao giai ngan
            </button>
          </PermissionGate>

          <SpecialPrivilegeGate projectId={projectId} privilege="BUDGET_APPROVER">
            <Link
              to={`/projects/${projectId}/budget/approvals`}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-100"
            >
              Duyet giai ngan
            </Link>
          </SpecialPrivilegeGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="app-card">
          <p className="text-xs text-slate-500">Tong du toan</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{money(overview.summary.estimated)} VND</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Ngan sach phe duyet</p>
          <p className="mt-1 text-xl font-bold text-brand-700">{money(overview.summary.approved)} VND</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Da chi</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{money(overview.summary.spent)} VND</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Con lai</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">{money(overview.summary.remaining)} VND</p>
        </div>
      </div>

      {showItemForm && (
        <PermissionGate projectId={projectId} toolId="BUDGET" minLevel="ADMIN">
          <div className="app-card space-y-3">
            <h3>Them hang muc ngan sach</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="form-label">Danh muc</label>
                <input
                  className="form-input"
                  value={itemForm.category}
                  onChange={(event) =>
                    setItemForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  placeholder="Vat tu / Nhan cong / Thiet bi"
                />
              </div>
              <div>
                <label className="form-label">Du toan (VND)</label>
                <input
                  type="number"
                  min={0}
                  className="form-input"
                  value={itemForm.estimatedCost}
                  onChange={(event) =>
                    setItemForm((prev) => ({ ...prev, estimatedCost: event.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="form-label">Mo ta</label>
              <input
                className="form-input"
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Muc phe duyet (tu chon)</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={itemForm.approvedCost}
                onChange={(event) =>
                  setItemForm((prev) => ({ ...prev, approvedCost: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowItemForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                onClick={() => createItemMutation.mutate()}
                disabled={createItemMutation.isPending}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Luu hang muc
              </button>
            </div>
          </div>
        </PermissionGate>
      )}

      {showDisbursementForm && (
        <PermissionGate projectId={projectId} toolId="BUDGET" minLevel="ADMIN">
          <div className="app-card space-y-3">
            <h3>Tao phieu giai ngan</h3>
            <div>
              <label className="form-label">Hang muc</label>
              <select
                className="form-input"
                value={disbursementForm.budgetItemId}
                onChange={(event) =>
                  setDisbursementForm((prev) => ({ ...prev, budgetItemId: event.target.value }))
                }
              >
                <option value="">Chon hang muc</option>
                {itemsData.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.category} - {item.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">So tien giai ngan (VND)</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={disbursementForm.amount}
                onChange={(event) =>
                  setDisbursementForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Ghi chu</label>
              <textarea
                rows={3}
                className="form-input"
                value={disbursementForm.note}
                onChange={(event) =>
                  setDisbursementForm((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDisbursementForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Huy
              </button>
              <button
                onClick={() => createDisbursementMutation.mutate()}
                disabled={createDisbursementMutation.isPending}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tao phieu
              </button>
            </div>
          </div>
        </PermissionGate>
      )}

      <div className="app-card space-y-3">
        <h3>Ngan sach theo danh muc</h3>
        {overview.byCategory.length === 0 ? (
          <p className="text-sm text-slate-500">Chua co du lieu danh muc.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Danh muc</th>
                  <th className="px-2 py-2">Du toan</th>
                  <th className="px-2 py-2">Da chi</th>
                  <th className="px-2 py-2">Con lai</th>
                </tr>
              </thead>
              <tbody>
                {overview.byCategory.map((item) => (
                  <tr key={item.category} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-2 font-medium text-slate-800">{item.category}</td>
                    <td className="px-2 py-2 text-slate-600">{money(item.approved)} VND</td>
                    <td className="px-2 py-2 text-amber-700">{money(item.spent)} VND</td>
                    <td className="px-2 py-2 text-emerald-700">{money(item.remaining)} VND</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h3>Danh sach hang muc</h3>
          <span className="text-xs text-slate-500">
            {itemsData.items.length} hang muc · {pendingDisbursementCount} giai ngan cho duyet
          </span>
        </div>

        {itemsData.items.length === 0 ? (
          <p className="text-sm text-slate-500">Chua co hang muc ngan sach nao.</p>
        ) : (
          <div className="space-y-2">
            {itemsData.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{item.category}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "PAID"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "APPROVED"
                          ? "bg-brand-50 text-brand-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-3">
                  <span>Du toan: {money(item.estimatedCost)} VND</span>
                  <span>Phe duyet: {money(item.approvedCost ?? item.estimatedCost)} VND</span>
                  <span>Da chi: {money(item.spentCost)} VND</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

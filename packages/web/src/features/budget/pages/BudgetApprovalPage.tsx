import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetApi } from "../api/budgetApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { SpecialPrivilegeGate } from "../../../shared/components/SpecialPrivilegeGate";
import { useUiStore } from "../../../store/uiStore";

function money(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

export function BudgetApprovalPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);

  const { data: itemsData, isLoading, isError } = useQuery({
    queryKey: ["budget-items", projectId],
    queryFn: () => budgetApi.listItems(projectId),
    enabled: Boolean(projectId),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; status: "APPROVED" | "PAID" }) =>
      budgetApi.approveDisbursement(projectId, payload.id, { status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-overview", projectId] });
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] });
      showToast({ type: "success", title: "Da duyet giai ngan" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the duyet giai ngan",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError || !itemsData) {
    return <ErrorState message="Khong tai duoc danh sach giai ngan." />;
  }

  const pendingDisbursements = itemsData.items.flatMap((item) =>
    (item.disbursements ?? [])
      .filter((disbursement) => disbursement.status === "PENDING")
      .map((disbursement) => ({
        ...disbursement,
        budgetItem: item,
      }))
  );

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={`/projects/${projectId}/budget`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          ← Budget overview
        </Link>
        <h2 className="mt-1">Duyet giai ngan</h2>
        <p className="page-subtitle">Danh sach phieu giai ngan dang cho phe duyet.</p>
      </div>

      <div className="app-card space-y-3">
        {pendingDisbursements.length === 0 ? (
          <p className="text-sm text-slate-500">Khong co phieu giai ngan nao dang cho duyet.</p>
        ) : (
          pendingDisbursements.map((disbursement) => (
            <div key={disbursement.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {disbursement.budgetItem?.category} - {disbursement.budgetItem?.description}
                  </p>
                  <p className="text-sm text-slate-600">
                    So tien: <span className="font-semibold">{money(disbursement.amount)} VND</span>
                  </p>
                  {disbursement.note && <p className="mt-1 text-xs text-slate-500">{disbursement.note}</p>}
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  PENDING
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Tao luc: {new Date(disbursement.createdAt).toLocaleString("vi-VN")}
              </div>

              <SpecialPrivilegeGate projectId={projectId} privilege="BUDGET_APPROVER">
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={() =>
                      approveMutation.mutate({
                        id: disbursement.id,
                        status: "APPROVED",
                      })
                    }
                    disabled={approveMutation.isPending}
                    className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Duyet
                  </button>
                  <button
                    onClick={() =>
                      approveMutation.mutate({
                        id: disbursement.id,
                        status: "PAID",
                      })
                    }
                    disabled={approveMutation.isPending}
                    className="rounded-xl bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Duyet & ghi nhan da chi
                  </button>
                </div>
              </SpecialPrivilegeGate>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

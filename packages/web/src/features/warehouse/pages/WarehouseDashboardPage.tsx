import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, ClipboardList, PackageSearch } from "lucide-react";
import { warehouseApi } from "../api/warehouseApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { PermissionGate } from "../../../shared/components/PermissionGate";
import { useProjectPermissions } from "../../../shared/hooks/useProjectPermissions";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

export function WarehouseDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const { user } = useAuthStore();
  const { data: projectPermissions } = useProjectPermissions(projectId);
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);

  const projectRole = projectPermissions?.projectRole;
  const canManageStock =
    user?.systemRole === "ADMIN" ||
    projectRole === "PROJECT_MANAGER" ||
    projectRole === "WAREHOUSE_KEEPER";
  const canApproveRequest = canManageStock || projectRole === "QUALITY_MANAGER";

  const { data: inventoryData, isLoading: inventoryLoading, isError: inventoryError } = useQuery({
    queryKey: ["warehouse-inventory", projectId],
    queryFn: () => warehouseApi.listInventory(projectId),
    enabled: Boolean(projectId),
  });

  const { data: transactionData, isLoading: transactionLoading, isError: transactionError } = useQuery({
    queryKey: ["warehouse-transactions", projectId],
    queryFn: () => warehouseApi.listTransactions(projectId),
    enabled: Boolean(projectId),
  });

  const approveMutation = useMutation({
    mutationFn: (payload: { id: string; status: "APPROVED" | "REJECTED" }) =>
      warehouseApi.updateRequest(projectId, payload.id, { status: payload.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-transactions", projectId] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory", projectId] });
      showToast({ type: "success", title: "Đã cập nhật yêu cầu vật tư" });
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Không thể cập nhật yêu cầu",
      });
    },
  });

  if (inventoryLoading || transactionLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (inventoryError || transactionError || !inventoryData || !transactionData) {
    return <ErrorState message="Không tải được dữ liệu kho vật tư." />;
  }

  const recentTransactions = transactionData.transactions.slice(0, 10);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="page-header">
        <div>
          <h2>Kho vật tư</h2>
          <p className="page-subtitle">Quản lý tồn kho, lịch sử nhập xuất và xử lý yêu cầu vật tư.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate projectId={projectId} toolId="WAREHOUSE" minLevel="READ">
            <Link
              to={`/projects/${projectId}/warehouse/transactions/new?type=REQUEST`}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Yêu cầu vật tư
            </Link>
          </PermissionGate>

          <PermissionGate projectId={projectId} toolId="WAREHOUSE" minLevel="STANDARD">
            {canManageStock && (
              <>
                <Link
                  to={`/projects/${projectId}/warehouse/transactions/new?type=IN`}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Nhập vật tư
                </Link>
                <Link
                  to={`/projects/${projectId}/warehouse/transactions/new?type=OUT`}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Xuất vật tư
                </Link>
              </>
            )}
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="app-card">
          <p className="text-xs text-slate-500">Tổng vật tư</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{inventoryData.summary.totalItems}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Cảnh báo tồn thấp</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{inventoryData.summary.lowStockItems}</p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Yêu cầu chờ duyệt</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{transactionData.summary.pending}</p>
        </div>
      </div>

      <div className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h3>Tồn kho</h3>
          {inventoryData.restricted ? (
            <span className="text-xs text-slate-500">Chỉ hiển thị danh mục vật tư</span>
          ) : (
            <span className="text-xs text-slate-500">{inventoryData.inventory.length} vật tư</span>
          )}
        </div>

        {inventoryData.inventory.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu tồn kho.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Vật tư</th>
                  <th className="px-2 py-2">Đơn vị</th>
                  {!inventoryData.restricted && <th className="px-2 py-2">Tồn kho</th>}
                  <th className="px-2 py-2">Vị trí</th>
                  {!inventoryData.restricted && <th className="px-2 py-2 text-right">Cảnh báo</th>}
                </tr>
              </thead>
              <tbody>
                {inventoryData.inventory.map((item) => {
                  const quantity = Number(item.quantity ?? 0);
                  const minQuantity = Number(item.minQuantity ?? 0);
                  const isLowStock = !inventoryData.restricted && quantity <= minQuantity;

                  return (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-2 py-2">
                        {inventoryData.restricted ? (
                          <span className="font-medium text-slate-800">{item.materialName}</span>
                        ) : (
                          <Link
                            to={`/projects/${projectId}/warehouse/inventory/${item.id}`}
                            className="font-medium text-brand-700 hover:text-brand-800"
                          >
                            {item.materialName}
                          </Link>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{item.unit}</td>
                      {!inventoryData.restricted && (
                        <td className="px-2 py-2 text-slate-700">{quantity.toLocaleString("vi-VN")}</td>
                      )}
                      <td className="px-2 py-2 text-slate-600">{item.location ?? "—"}</td>
                      {!inventoryData.restricted && (
                        <td className="px-2 py-2 text-right">
                          {isLowStock ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              Ton thap
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Ổn định</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="app-card space-y-3">
        <div className="flex items-center justify-between">
          <h3>Lịch sử giao dịch</h3>
          <span className="text-xs text-slate-500">{recentTransactions.length} giao dịch gan nhat</span>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        tx.type === "IN"
                          ? "bg-emerald-50 text-emerald-700"
                          : tx.type === "OUT"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      {tx.type}
                    </span>
                    <span className="font-medium text-slate-800">
                      {tx.inventory?.materialName ?? tx.inventoryId}
                    </span>
                    <span className="text-slate-500">
                      {Number(tx.quantity).toLocaleString("vi-VN")} {tx.inventory?.unit ?? ""}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(tx.status)}`}>
                    {tx.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {new Date(tx.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {tx.requester?.name ?? tx.requestedBy ?? "Hệ thống"}
                  </span>
                  {tx.note && <span className="line-clamp-1 max-w-[60%]">{tx.note}</span>}
                </div>

                {tx.type === "REQUEST" && tx.status === "PENDING" && canApproveRequest && (
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={() => approveMutation.mutate({ id: tx.id, status: "REJECTED" })}
                      disabled={approveMutation.isPending}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Tu choi
                    </button>
                    <button
                      onClick={() => approveMutation.mutate({ id: tx.id, status: "APPROVED" })}
                      disabled={approveMutation.isPending}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Duyệt
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="app-card">
        <h3 className="mb-2">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link
            to={`/projects/${projectId}/warehouse/transactions/new?type=REQUEST`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ClipboardList className="h-4 w-4 text-brand-600" />
            Tạo yêu cầu vật tư
          </Link>

          {canManageStock && (
            <>
              <Link
                to={`/projects/${projectId}/warehouse/transactions/new?type=IN`}
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <ArrowDownCircle className="h-4 w-4" />
                Nhập kho
              </Link>
              <Link
                to={`/projects/${projectId}/warehouse/transactions/new?type=OUT`}
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
              >
                <ArrowUpCircle className="h-4 w-4" />
                Xuất kho
              </Link>
            </>
          )}

          {!canManageStock && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <PackageSearch className="h-4 w-4 text-slate-500" />
              Bạn chỉ có quyền tạo yêu cầu vật tư
            </div>
          )}
        </div>
      </div>
    </div>
  );
}




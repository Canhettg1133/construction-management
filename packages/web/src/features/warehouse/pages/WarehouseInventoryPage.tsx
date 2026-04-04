import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { warehouseApi } from "../api/warehouseApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";

export function WarehouseInventoryPage() {
  const { id, inventoryId } = useParams<{ id: string; inventoryId: string }>();
  const projectId = id ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["warehouse-inventory-item", projectId, inventoryId],
    queryFn: () => warehouseApi.getInventoryItem(projectId, String(inventoryId)),
    enabled: Boolean(projectId) && Boolean(inventoryId),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState message="Không tải được chi tiết vật tư. Có thể bạn không được phép xem tồn kho." />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          to={`/projects/${projectId}/warehouse`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          ← Warehouse dashboard
        </Link>
        <h2 className="mt-1">{data.materialName}</h2>
        <p className="page-subtitle">
          Tồn kho: {Number(data.quantity).toLocaleString("vi-VN")} {data.unit}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="app-card">
          <p className="text-xs text-slate-500">Ton hiện tai</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {Number(data.quantity).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Nguong toi thieu</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">
            {Number(data.minQuantity).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="app-card">
          <p className="text-xs text-slate-500">Nguong toi da</p>
          <p className="mt-1 text-2xl font-bold text-brand-700">
            {Number(data.maxQuantity).toLocaleString("vi-VN")}
          </p>
        </div>
      </div>

      <div className="app-card">
        <div className="mb-2 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <span className="font-medium text-slate-700">Vị trí kho:</span> {data.location ?? "Chưa cập nhật"}
          </div>
          <div>
            <span className="font-medium text-slate-700">Cập nhật:</span>{" "}
            {new Date(data.updatedAt).toLocaleString("vi-VN")}
          </div>
        </div>

        <h3 className="mb-2">Lịch sử giao dịch</h3>
        {data.transactions && data.transactions.length > 0 ? (
          <div className="space-y-2">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {tx.type} · {Number(tx.quantity).toLocaleString("vi-VN")} {data.unit}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(tx.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Trạng thái: {tx.status}
                  {tx.requester?.name ? ` · ${tx.requester.name}` : ""}
                </p>
                {tx.note && <p className="mt-1 text-xs text-slate-600">{tx.note}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Chưa có giao dịch nào cho vật tư này.</p>
        )}
      </div>
    </div>
  );
}




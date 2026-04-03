import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { warehouseApi } from "../api/warehouseApi";
import { ErrorState } from "../../../shared/components/feedback/ErrorState";
import { SkeletonCard } from "../../../shared/components/feedback/SkeletonCard";
import { useProjectPermissions } from "../../../shared/hooks/useProjectPermissions";
import { useAuthStore } from "../../../store/authStore";
import { useUiStore } from "../../../store/uiStore";

type Mode = "IN" | "OUT" | "REQUEST";

function normalizeMode(value: string | null): Mode {
  if (value === "IN" || value === "OUT" || value === "REQUEST") {
    return value;
  }
  return "REQUEST";
}

export function WarehouseTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? "";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const showToast = useUiStore((state) => state.showToast);
  const { user } = useAuthStore();
  const { data: projectPermissions } = useProjectPermissions(projectId);

  const mode = normalizeMode(searchParams.get("type"));
  const projectRole = projectPermissions?.projectRole;
  const canManageStock =
    user?.systemRole === "ADMIN" ||
    projectRole === "PROJECT_MANAGER" ||
    projectRole === "WAREHOUSE_KEEPER";

  const [inventoryId, setInventoryId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const { data: inventoryData, isLoading, isError } = useQuery({
    queryKey: ["warehouse-inventory-options", projectId],
    queryFn: () => warehouseApi.listInventory(projectId),
    enabled: Boolean(projectId),
  });

  const inventoryOptions = useMemo(() => inventoryData?.inventory ?? [], [inventoryData?.inventory]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!inventoryId) {
        throw new Error("Vui long chon vat tu");
      }

      if (mode === "REQUEST") {
        return warehouseApi.createRequest(projectId, {
          inventoryId,
          quantity,
          note: note || undefined,
        });
      }

      return warehouseApi.createTransaction(projectId, {
        inventoryId,
        type: mode,
        quantity,
        note: note || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-inventory", projectId] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-transactions", projectId] });
      showToast({
        type: "success",
        title: mode === "REQUEST" ? "Da tao yeu cau vat tu" : "Da tao giao dich kho",
      });
      navigate(`/projects/${projectId}/warehouse`);
    },
    onError: (error: unknown) => {
      showToast({
        type: "error",
        title: "Loi",
        description: error instanceof Error ? error.message : "Khong the tao giao dich",
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

  if (isError || !inventoryData) {
    return <ErrorState message="Khong tai duoc danh muc vat tu." />;
  }

  if ((mode === "IN" || mode === "OUT") && !canManageStock) {
    return <ErrorState message="Ban khong co quyen tao giao dich nhap/xuat kho." />;
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
        <h2 className="mt-1">
          {mode === "REQUEST" ? "Tao yeu cau vat tu" : mode === "IN" ? "Nhap vat tu" : "Xuat vat tu"}
        </h2>
        <p className="page-subtitle">Nhap thong tin giao dich theo quy trinh kho vat tu.</p>
      </div>

      <div className="app-card space-y-3">
        <h3>Loai giao dich</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSearchParams({ type: "REQUEST" })}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              mode === "REQUEST"
                ? "bg-brand-100 text-brand-700 ring-1 ring-brand-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            REQUEST
          </button>
          {canManageStock && (
            <>
              <button
                onClick={() => setSearchParams({ type: "IN" })}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  mode === "IN"
                    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                IN
              </button>
              <button
                onClick={() => setSearchParams({ type: "OUT" })}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                  mode === "OUT"
                    ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                OUT
              </button>
            </>
          )}
        </div>
      </div>

      <div className="app-card space-y-4">
        <div>
          <label className="form-label">Vat tu</label>
          <select
            className="form-input"
            value={inventoryId}
            onChange={(event) => setInventoryId(event.target.value)}
          >
            <option value="">Chon vat tu</option>
            {inventoryOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.materialName} ({item.unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">So luong</label>
          <input
            type="number"
            min={0.001}
            step="0.001"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Ghi chu</label>
          <textarea
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="form-input"
            placeholder="Ghi ro muc dich giao dich/yeu cau..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Link
            to={`/projects/${projectId}/warehouse`}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Huy
          </Link>
          <button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mode === "REQUEST" ? "Tao yeu cau" : "Tao giao dich"}
          </button>
        </div>
      </div>
    </div>
  );
}

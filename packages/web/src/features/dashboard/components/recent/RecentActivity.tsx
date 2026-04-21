import { AUDIT_ACTION_LABELS } from "@construction/shared";
import { useDashboard } from "../../hooks/useDashboard";
import { useDashboardRole } from "../../hooks/useDashboardRole";

export function RecentActivity() {
  const role = useDashboardRole();
  const { data } = useDashboard();
  const items = data?.recentActivity ?? [];
  const maxItems = role.isAdmin || role.isPM ? 10 : 6;
  const visibleItems = items.slice(0, maxItems);

  return (
    <div className="app-card">
      <div className="mb-2 flex items-center justify-between">
        <h3>Hoạt động gần đây</h3>
        {data?.updatedAt ? (
          <span className="text-xs text-slate-500">
            Cập nhật: {new Date(data.updatedAt).toLocaleTimeString("vi-VN")}
          </span>
        ) : null}
      </div>
      <div className="mt-3 space-y-2">
        {visibleItems.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có hoạt động gần đây.</p>
        ) : (
          visibleItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
            >
              <span className="font-medium text-slate-900">
                {AUDIT_ACTION_LABELS[item.action] ?? item.action}
              </span>{" "}
              - {item.description}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
